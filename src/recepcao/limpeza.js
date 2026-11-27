const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js');
const db = require('../db');
const U = require('./util');
const L = require('../logs/nucleo');

const HORA = 3600 * 1000;
const COR = 0xf5a3c7;
const COR_AVISO = 0xf1c40f;

const TEXTO_PADRAO =
  '{usuario}, sua recepção está parada há cerca de **{parado}** 💜\n' +
  'Quando puder, continue de onde parou. Se precisar de ajuda, é só chamar a staff!\n' +
  '*Se ninguém responder, este canal poderá ser apagado.*';

const cfg = (k, p) => db.get(`config.recepcaolimpeza.${k}`, p);
const setCfg = (k, v) => db.set(`config.recepcaolimpeza.${k}`, v);
const chaveSessao = (id) => `recepcao.sessoes.${id}`;
const chaveAtiv = (id) => `recepcao.atividade.${id}`;

function conf() {
  const num = (k, p) => {
    const n = Number(cfg(k, p));
    return Number.isFinite(n) && n > 0 ? n : p;
  };
  const x = num('lembreteHoras', 12);
  let y = num('avisoHoras', 24);
  let z = num('apagarHoras', 48);
  if (y <= x) y = x + 1;
  if (z <= y) z = y + 1;
  return {
    ligado: cfg('ligado', false) === true,
    lembrete: x,
    aviso: y,
    apagar: z,
    canalAviso: cfg('canalAviso', null),
    cargoAviso: cfg('cargoAviso', null) || U.cfg('cargos.staff') || null,
    texto: cfg('textoLembrete', TEXTO_PADRAO) || TEXTO_PADRAO,
  };
}

function formatar(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round((ms / HORA) * 10) / 10;
  return `${h} h`;
}

const sessoes = () => {
  const s = db.get('recepcao.sessoes', {});
  return s && typeof s === 'object' ? s : {};
};

async function registrarAtividade(client, userId) {
  const s = db.get(chaveSessao(userId));
  if (!s) return;
  const antiga = db.get(chaveAtiv(userId));
  db.set(chaveAtiv(userId), { canalId: s.canalId, ultima: Date.now() });

  if (antiga && antiga.canalId === s.canalId && antiga.avisoMsgId && antiga.avisoCanalId) {
    try {
      const canal = await client.channels.fetch(antiga.avisoCanalId);
      const msg = await canal.messages.fetch(antiga.avisoMsgId);
      const base = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : new EmbedBuilder();
      await msg.edit({
        embeds: [base.setColor(COR).addFields({ name: 'Resultado', value: '✅ O membro voltou a participar da recepção.' })],
        components: [],
      });
    } catch {}
  }
}

function ultimaAtividade(sessao, canal, userId) {
  const a = db.get(chaveAtiv(userId));
  if (a && a.canalId === sessao.canalId && a.ultima) return a.ultima;
  return canal.createdTimestamp || Date.now();
}

async function encerrar(client, userId, { motivo, por } = {}) {
  const s = db.get(chaveSessao(userId));
  const ativ = db.get(chaveAtiv(userId));
  let guild = null;
  if (s) {
    const canal = await client.channels.fetch(s.canalId).catch(() => null);
    if (canal) {
      guild = canal.guild;
      await canal.delete(motivo || 'Recepção parada apagada pelo Atlas').catch((e) =>
        console.error('[Limpeza] não consegui apagar o canal:', e.message));
    }
  }
  db.remover(chaveSessao(userId));
  db.remover(chaveAtiv(userId));
  db.set(`recepcao.dispensados.${userId}`, Date.now());

  if (guild) {
    await L.enviar(
      guild,
      'membros',
      L.embed('amarelo', '🧹 Recepção parada encerrada', `A recepção de <@${userId}> foi apagada.`, [
        ['Motivo', motivo || 'Sem atividade', true],
        ['Quem', por ? `<@${por}>` : 'Atlas (automático)', true],
        ['Reabrir', '`/recepcaoreabrir`', true],
      ]),
    );
  }
  return { ativ };
}

async function enviarLembrete(canal, userId, parado, c) {
  const texto = U.preencher(c.texto, { usuario: `<@${userId}>`, parado: formatar(parado) });
  await canal.send({ content: texto.slice(0, 1900), allowedMentions: { users: [userId] } });
}

async function enviarAviso(client, canal, userId, sessao, ultima, c) {
  if (!c.canalAviso) return null;
  const destino = await client.channels.fetch(c.canalAviso).catch(() => null);
  if (!destino || !destino.send) return null;

  const apagaEm = Math.max(ultima + c.apagar * HORA, Date.now() + (c.apagar - c.aviso) * HORA);
  const embed = new EmbedBuilder()
    .setColor(COR_AVISO)
    .setTitle('🧹 Recepção parada')
    .setDescription(`<@${userId}> não responde há **${formatar(Date.now() - ultima)}**.`)
    .addFields(
      { name: 'Canal', value: `<#${canal.id}>`, inline: true },
      { name: 'Personagem', value: sessao.personagem || '—', inline: true },
      { name: 'Etapa', value: sessao.etapa || '—', inline: true },
      { name: 'Última atividade', value: `<t:${Math.floor(ultima / 1000)}:R>`, inline: true },
      { name: 'Apagada automaticamente', value: `<t:${Math.floor(apagaEm / 1000)}:R>`, inline: true },
    );
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`reclimp:apagar:${userId}`).setLabel('Apagar').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`reclimp:tempo:${userId}`).setLabel('Dar mais tempo').setEmoji('⏳').setStyle(ButtonStyle.Primary),
  );
  const msg = await destino.send({
    content: c.cargoAviso ? `<@&${c.cargoAviso}>` : undefined,
    embeds: [embed],
    components: [botoes],
    allowedMentions: c.cargoAviso ? { roles: [c.cargoAviso] } : { parse: [] },
  });
  return { canalId: destino.id, msgId: msg.id };
}

async function tratar(client, userId, sessao, c) {
  if (sessao.teste || sessao.assumido || sessao.etapa === 'aguardando') return;

  const canal = await client.channels.fetch(sessao.canalId).catch(() => null);
  if (!canal) return;

  const agora = Date.now();
  const ultima = ultimaAtividade(sessao, canal, userId);
  const parado = agora - ultima;
  let ativ = db.get(chaveAtiv(userId));
  if (!ativ || ativ.canalId !== sessao.canalId) ativ = { canalId: sessao.canalId, ultima };
  else ativ = { ...ativ };

  if (!ativ.lembreteEm) {
    if (parado >= c.lembrete * HORA) {
      await enviarLembrete(canal, userId, parado, c);
      ativ.lembreteEm = agora;
      db.set(chaveAtiv(userId), ativ);
    }
    return;
  }

  if (!ativ.avisoEm) {
    if (parado >= c.aviso * HORA && agora - ativ.lembreteEm >= (c.aviso - c.lembrete) * HORA) {
      const r = await enviarAviso(client, canal, userId, sessao, ultima, c).catch((e) => {
        console.error('[Limpeza] erro ao avisar a staff:', e.message);
        return null;
      });
      if (r) {
        ativ.avisoEm = agora;
        ativ.avisoCanalId = r.canalId;
        ativ.avisoMsgId = r.msgId;
        db.set(chaveAtiv(userId), ativ);
      }
    }
    return;
  }

  if (parado >= c.apagar * HORA && agora - ativ.avisoEm >= (c.apagar - c.aviso) * HORA) {
    await resolverAviso(client, ativ, '🗑️ Apagada automaticamente por falta de resposta.');
    await encerrar(client, userId, { motivo: `Sem atividade há ${formatar(parado)}` });
  }
}

async function resolverAviso(client, ativ, texto) {
  if (!ativ || !ativ.avisoCanalId || !ativ.avisoMsgId) return;
  try {
    const canal = await client.channels.fetch(ativ.avisoCanalId);
    const msg = await canal.messages.fetch(ativ.avisoMsgId);
    const base = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : new EmbedBuilder();
    await msg.edit({
      embeds: [base.setColor(COR).addFields({ name: 'Resultado', value: texto })],
      components: [],
    });
  } catch {}
}

let rodando = false;
async function tick(client, { forcar = false } = {}) {
  const c = conf();
  if ((!c.ligado && !forcar) || rodando) return { total: 0 };
  rodando = true;
  try {
    const lista = Object.entries(sessoes());
    for (const [userId, sessao] of lista) {
      try {
        await tratar(client, userId, sessao, c);
      } catch (e) {
        console.error('[Limpeza] erro numa recepção:', e.message);
      }
    }
    return { total: lista.length };
  } finally {
    rodando = false;
  }
}

async function resumo(client) {
  const c = conf();
  const r = { abertas: 0, excecoes: 0, lembradas: 0, avisadas: 0 };
  for (const [userId, s] of Object.entries(sessoes())) {
    r.abertas++;
    if (s.teste || s.assumido || s.etapa === 'aguardando') { r.excecoes++; continue; }
    const a = db.get(chaveAtiv(userId));
    if (a && a.canalId === s.canalId) {
      if (a.avisoEm) r.avisadas++;
      else if (a.lembreteEm) r.lembradas++;
    }
  }
  return { c, ...r };
}

async function darMaisTempo(client, userId, porId) {
  const s = db.get(chaveSessao(userId));
  if (!s) return false;
  const ativ = db.get(chaveAtiv(userId));
  db.set(chaveAtiv(userId), { canalId: s.canalId, ultima: Date.now() });
  await resolverAviso(client, ativ, `⏳ <@${porId}> deu mais tempo para o membro.`);
  return true;
}

async function apagarAgora(client, userId, porId) {
  const ativ = db.get(chaveAtiv(userId));
  await resolverAviso(client, ativ, `🗑️ Apagada por <@${porId}>.`);
  await encerrar(client, userId, { motivo: 'Apagada pela staff (recepção parada)', por: porId });
}

module.exports = {
  TEXTO_PADRAO, conf, setCfg, registrarAtividade, tick, resumo, darMaisTempo, apagarAgora, formatar, sessoes,
};
