// Núcleo de sorteios e eventos.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const RPG = require('../rpg/nucleo');

const COR = 0xf5a3c7;
const CINZA = 0x808080;
const BRT = 3 * 3600 * 1000; // Brasília = UTC-3 (sem horário de verão)
const ts = (ms) => Math.floor(ms / 1000);

// ---------- Tempo ----------
// "30m", "2h", "1d12h" -> milissegundos
function duracaoParaMs(txt) {
  const t = String(txt || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!/^(\d{1,6}[smhd])+$/.test(t)) return null;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  let total = 0;
  for (const m of t.matchAll(/(\d+)([smhd])/g)) total += Number(m[1]) * mult[m[2]];
  return total;
}

// "20:00", "25/10 20:00" ou "25/10/2026 20:00" (horário de Brasília) -> timestamp
function dataParaTs(txt) {
  const t = String(txt || '').trim();
  const agora = Date.now();
  const b = new Date(agora - BRT);
  let m;
  let dia;
  let mes;
  let ano;
  let h;
  let min;
  let temAno = false;

  if ((m = t.match(/^(\d{1,2})[:h](\d{2})$/))) {
    dia = b.getUTCDate(); mes = b.getUTCMonth() + 1; ano = b.getUTCFullYear(); h = +m[1]; min = +m[2];
  } else if ((m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s+(\d{1,2})[:h](\d{2})$/))) {
    dia = +m[1]; mes = +m[2]; temAno = !!m[3]; ano = m[3] ? +m[3] : b.getUTCFullYear(); h = +m[4]; min = +m[5];
  } else {
    return null;
  }

  const monta = (a, d) => {
    const dt = new Date(Date.UTC(a, mes - 1, d, h, min));
    if (dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d || h > 23 || min > 59) return null;
    return dt.getTime() + BRT;
  };

  let r = monta(ano, dia);
  if (r === null) return null;
  if (r < agora + 60000) {
    if (!m[3] && /^(\d{1,2})[:h](\d{2})$/.test(t)) r = monta(ano, dia + 1) ?? r + 86400000;
    else if (!temAno) r = monta(ano + 1, dia);
  }
  return r;
}

function proximoId(chave) {
  const n = db.get(`${chave}.contador`, 0) + 1;
  db.set(`${chave}.contador`, n);
  return String(n);
}

const mencoes = (ids, max = 40) => ids.slice(0, max).map((i) => `<@${i}>`).join(' ');

// ---------- Sorteios ----------
const getSorteio = (id) => db.get(`sorteios.lista.${id}`, null);
const salvarSorteio = (s) => db.set(`sorteios.lista.${s.id}`, s);
const todosSorteios = () => Object.values(db.get('sorteios.lista', {}) || {});

function textoPremio(s) {
  return s.premioTipo === 'stars' ? `⭐ **${s.premio} stars** para cada vencedor` : `**${s.premio}**`;
}

function embedSorteio(s) {
  const ativo = s.status === 'ativo';
  const sufixo = ativo ? '' : s.status === 'cancelado' ? ' — cancelado' : ' — encerrado';
  const emb = new EmbedBuilder()
    .setColor(ativo ? COR : CINZA)
    .setTitle(`🎉 Sorteio #${s.id}${sufixo}`)
    .setDescription(`Prêmio: ${textoPremio(s)}`);

  emb.addFields({ name: ativo ? '⏰ Termina' : '⏰ Terminou', value: `<t:${ts(s.fim)}:R> (<t:${ts(s.fim)}:f>)`, inline: false });

  if (ativo) {
    emb.addFields(
      { name: '🏆 Vencedores', value: `${s.vencedores}`, inline: true },
      { name: '👥 Participantes', value: `${s.participantes.length}`, inline: true },
    );
  } else if (s.status === 'encerrado') {
    emb.addFields({ name: '🏆 Vencedor(es)', value: s.ganhadores.length ? mencoes(s.ganhadores) : 'Ninguém elegível participou.', inline: false });
  }

  const req = [];
  if (s.cargoExigido) req.push(`Cargo <@&${s.cargoExigido}>`);
  if (s.nivelMin) req.push(`Nível ${s.nivelMin}+ no RPG`);
  if (s.premioTipo === 'stars') req.push('Personagem de RPG (/rpg criar)');
  if (req.length) emb.addFields({ name: '🎟️ Requisitos', value: req.join('\n'), inline: false });

  emb.setFooter({ text: `Criado por ${s.criadorNome || 'staff'}` });
  return emb;
}

function botoesSorteio(s) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`sorteio:entrar:${s.id}`)
      .setLabel(`Participar (${s.participantes.length})`)
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Success)
      .setDisabled(s.status !== 'ativo'),
  )];
}

async function buscarMensagem(client, canalId, msgId) {
  try {
    const canal = await client.channels.fetch(canalId);
    const msg = await canal.messages.fetch(msgId);
    return { canal, msg };
  } catch {
    return { canal: null, msg: null };
  }
}

async function atualizarMensagemSorteio(client, s) {
  const { msg } = await buscarMensagem(client, s.canalId, s.msgId);
  if (msg) await msg.edit({ embeds: [embedSorteio(s)], components: botoesSorteio(s) }).catch(() => {});
}

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sorteia entre quem ainda é elegível (continua no servidor, tem o cargo, tem personagem)
async function sortear(client, s, quantidade, excluir = []) {
  const guild = client.guilds.cache.get(s.guildId);
  const escolhidos = [];
  if (!guild) return escolhidos;
  for (const uid of embaralhar(s.participantes)) {
    if (escolhidos.length >= quantidade) break;
    if (excluir.includes(uid)) continue;
    const membro = await guild.members.fetch(uid).catch(() => null);
    if (!membro) continue;
    if (s.cargoExigido && !membro.roles.cache.has(s.cargoExigido)) continue;
    if (s.premioTipo === 'stars' && !RPG.obter(uid)) continue;
    escolhidos.push(uid);
  }
  return escolhidos;
}

function entregarStars(s, uids) {
  if (s.premioTipo !== 'stars') return;
  for (const uid of uids) {
    const j = RPG.obter(uid);
    if (!j) continue;
    j.moedas += s.premio;
    RPG.salvar(uid, j);
  }
}

async function anunciarGanhadores(client, s, novos, relancamento) {
  const { canal } = await buscarMensagem(client, s.canalId, s.msgId);
  const alvo = canal || (await client.channels.fetch(s.canalId).catch(() => null));
  if (!alvo) return;
  let texto;
  if (!novos.length) {
    texto = `😢 Ninguém elegível participou do sorteio **#${s.id}**.`;
  } else {
    texto = `${relancamento ? '🔁 Novo(s) vencedor(es)' : '🎉 Parabéns'} ${mencoes(novos)}! Você(s) ganhou(aram) ${textoPremio(s)} no sorteio **#${s.id}**.\n` +
      (s.premioTipo === 'stars'
        ? '⭐ As stars já foram depositadas no seu personagem.'
        : `🧾 O prêmio será entregue manualmente pela staff (<@${s.criadorId}>).`);
  }
  await alvo.send({
    content: texto,
    reply: { messageReference: s.msgId, failIfNotExists: false },
    allowedMentions: { users: [...novos, s.criadorId] },
  }).catch(() => {});
}

async function encerrarSorteio(client, id) {
  const s = getSorteio(id);
  if (!s) return { erro: 'Sorteio não encontrado.' };
  if (s.status !== 'ativo') return { erro: 'Esse sorteio já foi encerrado ou cancelado.' };
  s.status = 'encerrado';
  s.ganhadores = await sortear(client, s, s.vencedores);
  entregarStars(s, s.ganhadores);
  salvarSorteio(s);
  await atualizarMensagemSorteio(client, s);
  await anunciarGanhadores(client, s, s.ganhadores, false);
  return { ok: true, ganhadores: s.ganhadores };
}

async function cancelarSorteio(client, id) {
  const s = getSorteio(id);
  if (!s) return { erro: 'Sorteio não encontrado.' };
  if (s.status !== 'ativo') return { erro: 'Esse sorteio já foi encerrado ou cancelado.' };
  s.status = 'cancelado';
  salvarSorteio(s);
  await atualizarMensagemSorteio(client, s);
  return { ok: true };
}

async function rerolarSorteio(client, id, quantidade) {
  const s = getSorteio(id);
  if (!s) return { erro: 'Sorteio não encontrado.' };
  if (s.status !== 'encerrado') return { erro: 'Só dá para sortear de novo um sorteio já encerrado.' };
  const novos = await sortear(client, s, quantidade, s.ganhadores);
  if (!novos.length) return { erro: 'Não sobrou ninguém elegível para sortear.' };
  s.ganhadores = [...s.ganhadores, ...novos];
  entregarStars(s, novos);
  salvarSorteio(s);
  await atualizarMensagemSorteio(client, s);
  await anunciarGanhadores(client, s, novos, true);
  return { ok: true, ganhadores: novos };
}

// ---------- Eventos ----------
const getEvento = (id) => db.get(`eventos.lista.${id}`, null);
const salvarEvento = (e) => db.set(`eventos.lista.${e.id}`, e);
const todosEventos = () => Object.values(db.get('eventos.lista', {}) || {});

function embedEvento(e) {
  const ativo = e.status === 'ativo' || e.status === 'iniciado';
  const sufixo = e.status === 'cancelado' ? ' (cancelado)' : e.status === 'encerrado' ? ' (encerrado)' : '';
  const emb = new EmbedBuilder()
    .setColor(ativo ? COR : CINZA)
    .setTitle(`🎊 ${e.titulo}${sufixo}`)
    .addFields(
      { name: '🗓️ Quando', value: `<t:${ts(e.quando)}:F>\n<t:${ts(e.quando)}:R>`, inline: false },
      { name: '👥 Confirmados', value: `${e.confirmados.length}`, inline: true },
      { name: '🎤 Organização', value: `<@${e.criadorId}>`, inline: true },
    );
  if (e.descricao) emb.setDescription(e.descricao);
  return emb;
}

function botoesEvento(e) {
  const aberto = e.status === 'ativo' || e.status === 'iniciado';
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`evento:vou:${e.id}`)
      .setLabel(`Eu vou! (${e.confirmados.length})`)
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!aberto),
    new ButtonBuilder()
      .setCustomId(`evento:lista:${e.id}`)
      .setLabel('Quem vai')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary),
  )];
}

async function atualizarMensagemEvento(client, e) {
  const { msg } = await buscarMensagem(client, e.canalId, e.msgId);
  if (msg) await msg.edit({ embeds: [embedEvento(e)], components: botoesEvento(e) }).catch(() => {});
}

function pings(e) {
  const partes = [];
  if (e.cargoPing) partes.push(`<@&${e.cargoPing}>`);
  const texto = mencoes(e.confirmados, 50);
  if (texto) partes.push(texto);
  return partes.join(' ');
}

async function enviarNoCanal(client, e, conteudo) {
  const canal = await client.channels.fetch(e.canalId).catch(() => null);
  if (!canal) return;
  await canal.send({
    content: conteudo,
    allowedMentions: { roles: e.cargoPing ? [e.cargoPing] : [], users: e.confirmados.slice(0, 50) },
  }).catch(() => {});
}

async function cancelarEvento(client, id) {
  const e = getEvento(id);
  if (!e) return { erro: 'Evento não encontrado.' };
  if (e.status === 'cancelado' || e.status === 'encerrado') return { erro: 'Esse evento já foi encerrado ou cancelado.' };
  e.status = 'cancelado';
  salvarEvento(e);
  await atualizarMensagemEvento(client, e);
  await enviarNoCanal(client, e, `❌ O evento **${e.titulo}** foi cancelado. ${mencoes(e.confirmados, 30)}`);
  return { ok: true };
}

function premiarEvento(id, stars) {
  const e = getEvento(id);
  if (!e) return { erro: 'Evento não encontrado.' };
  if (e.status === 'cancelado') return { erro: 'Esse evento foi cancelado.' };
  let ok = 0;
  const sem = [];
  for (const uid of e.confirmados) {
    const j = RPG.obter(uid);
    if (!j) { sem.push(uid); continue; }
    j.moedas += stars;
    RPG.salvar(uid, j);
    ok++;
  }
  return { ok, sem };
}

// ---------- Agendador (roda a cada 15s) ----------
async function tick(client) {
  const agora = Date.now();

  for (const s of todosSorteios()) {
    if (s.status === 'ativo' && s.fim <= agora) {
      await encerrarSorteio(client, s.id).catch((e) => console.error('[Sorteio]', e));
    }
  }

  for (const e of todosEventos()) {
    if (e.status === 'cancelado' || e.status === 'encerrado') continue;
    const falta = e.quando - agora;
    let mudou = false;

    if (!e.aviso15 && falta > 0 && falta <= 15 * 60000) {
      e.aviso15 = true;
      mudou = true;
      await enviarNoCanal(client, e, `⏰ **${e.titulo}** começa <t:${ts(e.quando)}:R>! ${pings(e)}`);
    }
    if (!e.iniciou && falta <= 0) {
      e.iniciou = true;
      e.aviso15 = true;
      e.status = 'iniciado';
      mudou = true;
      await enviarNoCanal(client, e, `🎊 **${e.titulo}** começou! ${pings(e)}`);
    }
    if (e.iniciou && agora - e.quando > 6 * 3600000) {
      e.status = 'encerrado';
      mudou = true;
    }
    if (mudou) {
      salvarEvento(e);
      await atualizarMensagemEvento(client, e);
    }
  }
}

module.exports = {
  duracaoParaMs, dataParaTs, proximoId, mencoes, ts,
  getSorteio, salvarSorteio, todosSorteios, embedSorteio, botoesSorteio,
  encerrarSorteio, cancelarSorteio, rerolarSorteio,
  getEvento, salvarEvento, todosEventos, embedEvento, botoesEvento,
  cancelarEvento, premiarEvento, tick,
};
