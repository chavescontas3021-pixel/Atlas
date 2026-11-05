// Desligar o servidor: esconde TODOS os canais (menos o canal da staff) e guarda como cada canal
// estava, para o /servidor ligar devolver tudo igual. Nada é apagado.
//
// Como esconde: nega "Ver canal" para @everyone e transforma qualquer permissão explícita de
// "Ver canal" (cargos e membros) em negação. Administradores continuam vendo (o Discord não permite
// esconder nada deles). O bot ganha acesso próprio aos canais, para conseguir reabrir depois.
const { PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const L = require('../logs/nucleo');

const VER = P.ViewChannel;
const ADMIN = P.Administrator;
const ESTADO = 'servidor.estado';
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Pedidos de confirmação (ficam só na memória, expiram em 5 minutos)
const pendentes = new Map();
let ocupado = false;

const estado = () => db.get(ESTADO, null);
const estaOcupado = () => ocupado;

const comoTexto = (o) => ({
  id: o.id,
  type: o.type,
  allow: String(o.allow.bitfield),
  deny: String(o.deny.bitfield),
});

function negarVer(o) {
  o.allow = String(BigInt(o.allow) & ~VER);
  o.deny = String(BigInt(o.deny) | VER);
}

const assinatura = (lista) =>
  JSON.stringify([...lista].map((o) => [o.id, o.type, String(o.allow), String(o.deny)]).sort());

// Calcula as novas permissões de um canal. Devolve null se o canal já está escondido.
function novasPermissoes(original, { guildId, botId, botAdmin, cargosAdmin }) {
  const novas = original.map((o) => ({ ...o }));

  let todos = novas.find((o) => o.id === guildId);
  if (!todos) {
    todos = { id: guildId, type: 0, allow: '0', deny: '0' };
    novas.push(todos);
  }
  negarVer(todos);

  for (const o of novas) {
    if (o.id === guildId || o.id === botId) continue;
    if (o.type === 0 && cargosAdmin.has(o.id)) continue;
    if (BigInt(o.allow) & VER) negarVer(o);
  }

  if (assinatura(novas) === assinatura(original)) return null;

  // O bot precisa continuar vendo o canal para conseguir reabrir
  if (!botAdmin) {
    let eu = novas.find((o) => o.id === botId);
    if (!eu) {
      eu = { id: botId, type: 1, allow: '0', deny: '0' };
      novas.push(eu);
    }
    eu.allow = String(BigInt(eu.allow) | VER);
    eu.deny = String(BigInt(eu.deny) & ~VER);
  }
  return novas;
}

function pedirConfirmacao(userId, dados) {
  pendentes.set(userId, { ...dados, expira: Date.now() + 5 * 60 * 1000 });
}
function pegarPedido(userId) {
  const p = pendentes.get(userId);
  if (!p || p.expira < Date.now()) {
    pendentes.delete(userId);
    return null;
  }
  return p;
}
const limparPedido = (userId) => pendentes.delete(userId);

// ---------- Desligar ----------
async function desligar(guild, { canalMantido, porId, pausarConvites }, progresso = async () => {}) {
  if (ocupado) throw new Error('Já existe uma operação em andamento.');
  ocupado = true;
  try {
    const eu = guild.members.me ?? (await guild.members.fetchMe());
    const ctx = {
      guildId: guild.id,
      botId: eu.id,
      botAdmin: eu.permissions.has(ADMIN),
      cargosAdmin: new Set(guild.roles.cache.filter((r) => r.permissions.has(ADMIN)).map((r) => r.id)),
    };

    // Retoma uma operação interrompida ou começa uma nova
    let st = estado();
    if (!st) {
      st = {
        ativo: true,
        fase: 'fechando',
        em: Date.now(),
        por: porId,
        mantido: canalMantido,
        convitesPausados: false,
        canais: {},
      };
      db.set(ESTADO, st);
    }
    const mantido = st.mantido || canalMantido;

    const alvos = [...guild.channels.cache.values()].filter((c) => c.permissionOverwrites && c.id !== mantido);
    const r = { total: alvos.length, fechados: 0, jaEscondidos: 0, falhas: [] };

    let feitos = 0;
    for (const canal of alvos) {
      feitos++;
      if (st.canais[canal.id]) {
        r.fechados++; // já feito antes de uma interrupção
      } else {
        const original = [...canal.permissionOverwrites.cache.values()].map(comoTexto);
        const novas = novasPermissoes(original, ctx);
        if (!novas) {
          r.jaEscondidos++;
        } else {
          // Guarda ANTES de mexer: se o bot cair no meio, dá para desfazer
          db.set(`${ESTADO}.canais.${canal.id}`, original);
          try {
            await canal.permissionOverwrites.set(novas, 'Servidor desligado');
            r.fechados++;
          } catch (e) {
            db.remover(`${ESTADO}.canais.${canal.id}`);
            r.falhas.push(`#${canal.name} (${e.message})`);
          }
          await dormir(250);
        }
      }

      // Tira da call quem estava conectado (administradores ficam)
      if (canal.members && canal.members.size && [2, 13].includes(canal.type)) {
        for (const m of canal.members.values()) {
          if (m.id === eu.id || m.permissions.has(ADMIN)) continue;
          await m.voice.disconnect('Servidor desligado').catch(() => {});
        }
      }
      if (feitos % 5 === 0) await progresso(feitos, alvos.length);
    }

    // Pausa os convites, se o Discord/biblioteca permitir
    let convites = 'não pedido';
    if (pausarConvites) {
      const jaPausados = !!(guild.features && guild.features.includes('INVITES_DISABLED'));
      if (jaPausados) convites = 'já estavam pausados';
      else if (typeof guild.disableInvites === 'function') {
        try {
          await guild.disableInvites(true);
          db.set(`${ESTADO}.convitesPausados`, true);
          convites = 'pausados';
        } catch (e) {
          convites = `não consegui pausar (${e.message})`;
        }
      } else convites = 'sua versão do discord.js não pausa convites: pause em Configurações do servidor > Convites';
    }

    db.set(`${ESTADO}.fase`, r.falhas.length ? 'fechando' : 'fechado');
    r.convites = convites;

    await L.enviar(
      guild,
      'servidor',
      L.embed('vermelho', '🔌 Servidor desligado', `Desligado por <@${porId}>.`, [
        ['Canais escondidos', String(r.fechados), true],
        ['Já escondidos', String(r.jaEscondidos), true],
        ['Falhas', String(r.falhas.length), true],
        ['Canal mantido', mantido ? `<#${mantido}>` : '—', true],
        ['Convites', convites, true],
      ]),
    );
    return r;
  } finally {
    ocupado = false;
  }
}

// ---------- Ligar ----------
function filtrarCargosExistentes(guild, lista) {
  return lista.filter((o) => o.type !== 0 || guild.roles.cache.has(o.id) || o.id === guild.id);
}

async function restaurarCanal(guild, canal, original) {
  try {
    await canal.permissionOverwrites.set(original, 'Servidor ligado');
    return;
  } catch (e) {
    // Cargo ou membro que não existe mais: tenta de novo sem eles
    const limpo = [];
    for (const o of filtrarCargosExistentes(guild, original)) {
      if (o.type === 1) {
        const m = await guild.members.fetch(o.id).catch(() => null);
        if (!m) continue;
      }
      limpo.push(o);
    }
    await canal.permissionOverwrites.set(limpo, 'Servidor ligado');
  }
}

async function ligar(guild, { porId }, progresso = async () => {}) {
  if (ocupado) throw new Error('Já existe uma operação em andamento.');
  const st = estado();
  if (!st) return null;
  ocupado = true;
  try {
    db.set(`${ESTADO}.fase`, 'abrindo');
    const ids = Object.keys(st.canais || {});
    const r = { total: ids.length, restaurados: 0, sumidos: 0, falhas: [] };

    let feitos = 0;
    for (const id of ids) {
      feitos++;
      const canal = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
      if (!canal) {
        db.remover(`${ESTADO}.canais.${id}`);
        r.sumidos++;
      } else {
        try {
          await restaurarCanal(guild, canal, st.canais[id]);
          db.remover(`${ESTADO}.canais.${id}`);
          r.restaurados++;
        } catch (e) {
          r.falhas.push(`#${canal.name} (${e.message})`);
        }
        await dormir(250);
      }
      if (feitos % 5 === 0) await progresso(feitos, ids.length);
    }

    let convites = '';
    if (!r.falhas.length) {
      if (st.convitesPausados && typeof guild.disableInvites === 'function') {
        try {
          await guild.disableInvites(false);
          convites = 'reativados';
        } catch (e) {
          convites = `não consegui reativar (${e.message}) — reative em Configurações > Convites`;
        }
      }
      db.remover(ESTADO);
    } else {
      db.set(`${ESTADO}.fase`, 'fechado');
    }
    r.convites = convites;

    await L.enviar(
      guild,
      'servidor',
      L.embed('verde', '🔌 Servidor ligado', `Reaberto por <@${porId}>.`, [
        ['Canais restaurados', String(r.restaurados), true],
        ['Falhas', String(r.falhas.length), true],
        convites ? ['Convites', convites, true] : null,
      ]),
    );
    return r;
  } finally {
    ocupado = false;
  }
}

module.exports = {
  estado, estaOcupado, desligar, ligar, pedirConfirmacao, pegarPedido, limparPedido, novasPermissoes,
};
