// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · vigias
//  Raid (muitas entradas), flood/spam e golpes (links falsos). Cada vigia tem um poder:
//    off       → não faz nada
//    confirma  → com o pai presente: avisa e espera o clique · com o pai ausente: age sozinha
//    auto      → age sozinha sempre
//  As ações são sempre leves e reversíveis (castigo, apagar spam, trancar canais).
//  Nunca age contra staff, pai, delegados ou bots.
// ─────────────────────────────────────────────────────────────
const { PermissionFlagsBits: PF, ChannelType } = require('discord.js');
const db = require('../db');
const UI = require('../ui/componentes');
const N = require('./nucleo');
const A = require('./acoes');
const Ordem = require('./ordem');

const SEM_PING = { parse: [] };
const frescos = new Map(); // quem já foi punido há pouco → não pune de novo

// ── Alertas ──────────────────────────────────────────────────
async function alertar(client, guild, { titulo, descricao, componentes = [], pingarPai = false }) {
  const pai = await N.paiId(client);
  const payload = {
    content: pingarPai && pai ? `<@${pai}>` : undefined,
    embeds: [UI.painel({ trilha: ['Sub dona', 'Alerta'], titulo, descricao, perigo: true }).setTimestamp()],
    components: componentes,
    allowedMentions: { users: pingarPai && pai ? [pai] : [], parse: [] },
  };
  const id = N.alertasCanal();
  const canal = id && guild.channels.cache.get(id);
  try {
    if (canal) return await canal.send(payload);
    const dono = pai && (await client.users.fetch(pai));
    if (dono) return await dono.send(payload);
  } catch (e) { console.error('[Sub dona] alerta:', e.message); }
  return null;
}

// Executa (ou propõe) uma ação conforme o poder do vigia
async function acionar({ client, guild, canal, poder, acao, params, titulo, descricao, pingarPai = false }) {
  const modo = N.modoEfetivo(poder);
  if (modo === 'off') return null;
  const eu = guild.members.me;
  const ctx = { client, guild, canal, executor: eu, executorUser: client.user, ehPai: false };
  if (modo === 'auto') {
    const payload = await Ordem.rodar(ctx, acao, params, 'auto');
    const texto = (payload.embeds && payload.embeds[0] && payload.embeds[0].d && payload.embeds[0].d.description) || '';
    await alertar(client, guild, { titulo, descricao: `${descricao}\n\n${texto}`, componentes: payload.components || [], pingarPai });
    return { feito: true };
  }
  const token = N.guardarPendente({ acao, params: { ...params, canalAlvo: undefined, canalId: params.canalAlvo ? params.canalAlvo.id : null }, executor: 'auto', canalId: canal.id, guildId: guild.id, origem: 'auto' });
  await alertar(client, guild, {
    titulo, descricao: `${descricao}\n\nQuer que eu faça isso? ${A.descrever(acao, params)}`, pingarPai,
    componentes: [UI.linha(UI.botao({ id: `sd:ok:${token}`, label: 'Fazer' }), UI.botao({ id: `sd:no:${token}`, label: 'Ignorar' }))],
  });
  return { proposto: true };
}

// ── Quem não deve ser vigiado ────────────────────────────────
async function isento(client, membro) {
  if (!membro || membro.user.bot) return true;
  const p = membro.permissions;
  if (p.has(PF.Administrator) || p.has(PF.ManageGuild) || p.has(PF.ManageMessages) || p.has(PF.ModerateMembers)) return true;
  return N.ehDelegado(membro.id) || (await N.ehPai(client, membro.id));
}

// ── Flood, repetição, spam de menção e golpes ────────────────
const hist = new Map();
const GOLPE = /(discord(?:app)?\.gift|d[il1]sc[o0]rd?[-.]?(?:gift|nitro)|dlscord|discorcl|disc0rd|n[i1]tro[-.]?(?:free|gift|gratis)|free[-.]?nitro|steamcommunnity|steamcomunity|st[e3]amcommunlty|nitro gratis|ganhe nitro)/i;

async function aoMensagem(client, msg) {
  if (!N.ativo() || !msg.guild || msg.author.bot || msg.webhookId || !msg.member) return;
  if (await isento(client, msg.member)) return;
  const uid = msg.author.id;
  if (Date.now() - (frescos.get(uid) || 0) < 2 * 60 * 1000) return;
  const agora = Date.now();
  const texto = String(msg.content || '');

  const h = (hist.get(uid) || []).filter((x) => agora - x.t < 30000);
  h.push({ t: agora, txt: texto.toLowerCase().replace(/\s+/g, ' ').trim(), c: msg.channelId });
  hist.set(uid, h);
  if (hist.size > 5000) hist.clear();

  const base = { client, guild: msg.guild, canal: msg.channel };
  const alvo = { alvo: uid };
  const marcar = () => frescos.set(uid, agora);

  // 1) golpe: apaga o link na hora (se o vigia estiver ligado) e castiga
  if (GOLPE.test(texto) && N.modoEfetivo('vigia_golpe') !== 'off') {
    marcar();
    await msg.delete().catch(() => {});
    return await acionar({ ...base, poder: 'vigia_golpe', acao: 'silenciar', params: { ...alvo, ms: 86400000, motivo: 'Link de golpe' }, titulo: 'Possível golpe apagado', descricao: `<@${uid}> postou um link suspeito em ${msg.channel}. Apaguei a mensagem.` });
  }
  // 2) spam de menção
  if (msg.mentions.users.size >= 6 || msg.mentions.roles.size >= 3) {
    marcar();
    await msg.delete().catch(() => {});
    return await acionar({ ...base, poder: 'vigia_flood', acao: 'silenciar', params: { ...alvo, ms: 900000, motivo: 'Spam de menções' }, titulo: 'Spam de menções', descricao: `<@${uid}> marcou muita gente de uma vez em ${msg.channel}.` });
  }
  // 3) flood (muitas mensagens rápidas) ou a mesma mensagem repetida
  const rapidas = h.filter((x) => agora - x.t < 8000).length;
  const iguais = texto.length >= 8 ? h.filter((x) => x.txt === h[h.length - 1].txt).length : 0;
  if (rapidas >= 6 || iguais >= 4) {
    marcar();
    return await acionar({ ...base, poder: 'vigia_flood', acao: 'silenciar', params: { ...alvo, ms: 600000, motivo: rapidas >= 6 ? 'Flood' : 'Mensagem repetida' }, titulo: rapidas >= 6 ? 'Flood' : 'Spam repetido', descricao: `<@${uid}> está ${rapidas >= 6 ? 'mandando mensagens rápido demais' : 'repetindo a mesma mensagem'} em ${msg.channel}.` })
      .then(() => (N.modoEfetivo('vigia_flood') === 'auto' ? A.executar('limpar', { n: 15, alvo: uid }, { client, guild: msg.guild, canal: msg.channel, executor: msg.guild.members.me, executorUser: client.user, ehPai: false }) : null));
  }
}

// ── Raid ─────────────────────────────────────────────────────
const entradas = [];
let ultimoRaid = 0;
const limiteRaid = () => Math.max(3, Number(N.cfg('raid_limite', 8)) || 8);

async function aoEntrar(client, membro) {
  if (!N.ativo() || membro.user.bot) return;
  const agora = Date.now();
  entradas.push(agora);
  while (entradas.length && agora - entradas[0] > 60000) entradas.shift();
  if (entradas.length < limiteRaid() || agora - ultimoRaid < 10 * 60 * 1000) return;
  const modo = N.modoEfetivo('vigia_raid');
  if (modo === 'off') return;
  ultimoRaid = agora;
  const guild = membro.guild;
  const desc = `${entradas.length} pessoas entraram em menos de 1 minuto. Pode ser um raid.`;
  if (modo === 'auto') {
    const r = await panico(guild, true);
    return await alertar(client, guild, {
      titulo: 'Raid: servidor trancado', descricao: `${desc}\nTranquei **${r.trancados}** canais. Quando passar, use o botão ou \`/subdona panico\`.`, pingarPai: true,
      componentes: [UI.linha(UI.botao({ id: 'sd:panico:off', label: 'Destrancar tudo' }))],
    });
  }
  await alertar(client, guild, { titulo: 'Possível raid', descricao: `${desc}\nQuer que eu tranque todos os canais?`, pingarPai: true, componentes: [UI.linha(UI.botao({ id: 'sd:panico:on', label: 'Trancar tudo', estilo: 'perigo' }), UI.botao({ id: 'sd:panico:no', label: 'Ignorar' }))] });
}

// ── Pânico: tranca (ou destranca) todos os canais de texto ───
const canaisTexto = (guild) => [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement);
const estadoPanico = () => db.get('subdona.panico', null);

async function panico(guild, ligar) {
  const todos = guild.roles.everyone;
  if (ligar) {
    const salvo = estadoPanico() || { desde: Date.now(), canais: {} };
    let trancados = 0;
    for (const c of canaisTexto(guild)) {
      const ow = c.permissionOverwrites.cache.get(todos.id);
      const era = ow ? (ow.allow.has(PF.SendMessages) ? true : ow.deny.has(PF.SendMessages) ? false : null) : null;
      if (era === false || c.id in salvo.canais) continue;
      try { await c.permissionOverwrites.edit(todos, { SendMessages: false }, { reason: 'Atlas: modo pânico' }); salvo.canais[c.id] = era; trancados += 1; } catch { /* sem permissão neste canal */ }
    }
    db.set('subdona.panico', salvo);
    return { trancados };
  }
  const salvo = estadoPanico();
  let abertos = 0;
  if (salvo) {
    for (const [id, era] of Object.entries(salvo.canais)) {
      const c = guild.channels.cache.get(id);
      if (!c) continue;
      try { await c.permissionOverwrites.edit(todos, { SendMessages: era }, { reason: 'Atlas: fim do modo pânico' }); abertos += 1; } catch { /* ignora */ }
    }
  }
  db.set('subdona.panico', null);
  return { abertos };
}

module.exports = { aoMensagem, aoEntrar, panico, estadoPanico, alertar, acionar, isento, _teste: { entradas, hist, frescos, zerarRaid: () => { ultimoRaid = 0; } } };
