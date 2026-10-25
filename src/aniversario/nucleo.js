// Aniversários: cadastro, cargo de aniversariante e mensagem de festa.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;
const BRT = 3 * 3600 * 1000; // Brasília = UTC-3

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const PADROES = {
  hora: '08:00',
  mensagens: {
    anuncio: {
      titulo: '🎂 Hoje tem festa!',
      texto:
        'Hoje é aniversário de {usuarios}! 🎉\n\n' +
        '{cargo} Bora fazer uma festinha para comemorar! 🥳🎈',
    },
  },
};

function cfg(chave, padrao) {
  return db.get(`config.aniversario.${chave}`, padrao);
}

function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

const hora = () => cfg('hora', PADROES.hora);

function normalizarHora(txt) {
  const m = String(txt).trim().match(/^(\d{1,2})(?:[:hH](\d{2})?)?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// ---------- Datas (sempre no horário de Brasília) ----------
const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dataValida(dia, mes) {
  return Number.isInteger(dia) && Number.isInteger(mes) && mes >= 1 && mes <= 12 && dia >= 1 && dia <= DIAS_NO_MES[mes - 1];
}

function hojeBRT(agora = Date.now()) {
  const b = new Date(agora - BRT);
  const dia = b.getUTCDate();
  const mes = b.getUTCMonth() + 1;
  const ano = b.getUTCFullYear();
  const hm = `${String(b.getUTCHours()).padStart(2, '0')}:${String(b.getUTCMinutes()).padStart(2, '0')}`;
  const chave = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return { dia, mes, ano, hm, chave };
}

// Quem nasceu em 29/02 comemora em 28/02 nos anos que não são bissextos
function diaEfetivo(d, ano) {
  return d.dia === 29 && d.mes === 2 && !bissexto(ano) ? 28 : d.dia;
}

function diasAte(d, hoje) {
  const base = Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia);
  let alvo = Date.UTC(hoje.ano, d.mes - 1, diaEfetivo(d, hoje.ano));
  if (alvo < base) alvo = Date.UTC(hoje.ano + 1, d.mes - 1, diaEfetivo(d, hoje.ano + 1));
  return Math.round((alvo - base) / 86400000);
}

// ---------- Cadastro ----------
const datas = () => db.get('aniversario.datas', {}) || {};
const obterData = (id) => db.get(`aniversario.datas.${id}`, null);
const definirData = (id, dia, mes) => db.set(`aniversario.datas.${id}`, { dia, mes });
const removerData = (id) => db.remover(`aniversario.datas.${id}`);
const fmtData = (d) => `${String(d.dia).padStart(2, '0')}/${String(d.mes).padStart(2, '0')}`;

function aniversariantesDeHoje(hoje) {
  return Object.entries(datas())
    .filter(([, d]) => d.mes === hoje.mes && diaEfetivo(d, hoje.ano) === hoje.dia)
    .map(([id]) => id);
}

function proximos(limite, hoje) {
  return Object.entries(datas())
    .map(([id, d]) => ({ id, d, dias: diasAte(d, hoje) }))
    .sort((a, b) => a.dias - b.dias)
    .slice(0, limite);
}

function listaTexto(ids) {
  const m = ids.map((i) => `<@${i}>`);
  if (m.length <= 1) return m.join('');
  return `${m.slice(0, -1).join(', ')} e ${m[m.length - 1]}`;
}

// ---------- Celebração ----------
function pegarCanal(guild) {
  const id = cfg('canal');
  return id ? guild.channels.cache.get(id) : null;
}

async function celebrar(guild, ids, { teste = false, agora = Date.now() } = {}) {
  const canal = pegarCanal(guild);
  if (!canal) return { erro: 'Canal de aniversários não definido (ou não existe mais).' };

  const membros = [];
  for (const id of ids) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (m) membros.push(m);
  }
  if (!membros.length) return { qtd: 0 };

  const cargoId = cfg('cargo');
  let falhasCargo = 0;
  if (cargoId && !teste) {
    for (const m of membros) {
      try {
        await m.roles.add(cargoId, 'Aniversário');
        db.set(`aniversario.ativos.${m.id}`, agora + 24 * 3600 * 1000);
      } catch {
        falhasCargo++;
      }
    }
  }

  const msg = mensagem('anuncio');
  const vars = {
    usuarios: listaTexto(membros.map((m) => m.id)),
    cargo: cargoId ? `<@&${cargoId}>` : '',
    servidor: guild.name,
    quantidade: String(membros.length),
  };
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(preencher(msg.titulo, vars))
    .setDescription(preencher(msg.texto, vars));

  // O ping vai FORA do embed (menção dentro de embed não notifica).
  const usaCargo = cargoId && !teste;
  const content = (teste ? '🧪 **Teste** — ' : '') + (usaCargo ? `<@&${cargoId}>` : listaTexto(membros.map((m) => m.id)));
  try {
    await canal.send({
      content,
      embeds: [embed],
      allowedMentions: { roles: usaCargo ? [cargoId] : [], users: usaCargo ? [] : membros.map((m) => m.id) },
    });
  } catch {
    return { erro: 'Não consegui enviar no canal de aniversários (falta permissão).' };
  }
  return { qtd: membros.length, falhasCargo };
}

async function removerExpirados(guild, agora = Date.now()) {
  const ativos = db.get('aniversario.ativos', {}) || {};
  const cargoId = cfg('cargo');
  for (const [id, quando] of Object.entries(ativos)) {
    if (quando > agora) continue;
    if (cargoId) {
      const m = await guild.members.fetch(id).catch(() => null);
      if (m) await m.roles.remove(cargoId, 'Fim do dia de aniversário').catch(() => {});
    }
    db.remover(`aniversario.ativos.${id}`);
  }
}

async function tick(client, agora = Date.now()) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
  if (!guild) return;
  await removerExpirados(guild, agora);
  if (!cfg('ativo', false)) return;

  const hoje = hojeBRT(agora);
  if (db.get('aniversario.ultimoDia', null) === hoje.chave) return;
  if (hoje.hm < hora()) return;
  if (!pegarCanal(guild)) return; // sem canal: tenta de novo quando for configurado

  db.set('aniversario.ultimoDia', hoje.chave);
  const ids = aniversariantesDeHoje(hoje);
  if (!ids.length) return;
  const r = await celebrar(guild, ids, { agora });
  if (r.erro) console.error('[Aniversário]', r.erro);
  else if (r.falhasCargo) console.error(`[Aniversário] ${r.falhasCargo} falha(s) ao dar o cargo (o cargo do Atlas precisa estar acima dele).`);
}

module.exports = {
  PADROES, MESES, cfg, mensagem, preencher, hora, normalizarHora,
  dataValida, hojeBRT, diasAte, obterData, definirData, removerData, fmtData, datas,
  aniversariantesDeHoje, proximos, listaTexto, celebrar, removerExpirados, tick,
};
