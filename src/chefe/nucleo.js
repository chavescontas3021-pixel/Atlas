// Eventos de chefe: um monstro gigante que a house inteira ataca junto.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
} = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');
const S = require('../extras/stars');
const Dragao = require('./dragao');

const COR = 0xf5a3c7;
const CD_ATAQUE = 20 * 1000;
const CD_FORTE = 5 * 60 * 1000;

const PADROES = {
  mensagens: {
    chamada: {
      titulo: '{emoji} {chefe} apareceu!',
      texto: 'Um chefe poderoso surgiu! Ataquem juntos antes que o tempo acabe!\nQuanto mais dano você causar, maior sua parte do prêmio. 💜',
    },
    vitoria: {
      titulo: '🏆 {chefe} foi derrotado!',
      texto: 'Obrigada a todos que lutaram! 🎉\n⚔️ Golpe final: {ultimo}\n👑 MVP: {mvp}',
    },
    fuga: {
      titulo: '💨 {chefe} escapou...',
      texto: 'O tempo acabou e o chefe fugiu. Quem lutou recebeu um prêmio de consolação.',
    },
  },
};

const mensagem = (tipo) => ({ ...PADROES.mensagens[tipo], ...(db.get(`config.chefe.mensagens.${tipo}`) || {}) });
const preencher = (texto, vars) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
const fmt = (n) => Number(n).toLocaleString('pt-BR');
const fmtSeg = (ms) => `${Math.ceil(ms / 1000)}s`;

const ativo = () => db.get('chefe.ativo', null);
const salvarAtivo = (a) => db.set('chefe.ativo', a);
const agenda = () => Object.values(db.get('chefe.agenda', {}) || {}).sort((a, b) => a.quando - b.quando);

function proximoId() {
  const n = db.get('chefe.contador', 0) + 1;
  db.set('chefe.contador', n);
  return String(n);
}

const rank = (a) => Object.entries(a.dano || {}).sort((x, y) => y[1] - x[1]);

// ---------- Visual ----------
function embedChefe(a) {
  const vars = { chefe: a.nome, emoji: a.emoji, hp: fmt(a.hpMax) };
  const m = mensagem('chamada');
  const top = rank(a).slice(0, 5).map(([u, d], i) => `${['🥇', '🥈', '🥉'][i] || `${i + 1}.`} <@${u}> — ${fmt(d)}`).join('\n') || 'Ninguém atacou ainda.';
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(preencher(m.titulo, vars))
    .setDescription(preencher(m.texto, vars))
    .addFields(
      { name: '❤️ Vida', value: `${R.barra(a.hp, a.hpMax, 16)}\n**${fmt(a.hp)}** / ${fmt(a.hpMax)}` },
      { name: '⏳ Tempo', value: `Termina <t:${Math.floor(a.fim / 1000)}:R>`, inline: true },
      { name: '🎁 Prêmio', value: `⭐ ${fmt(a.premio)} · ✨ ${fmt(a.xp)} XP`, inline: true },
      { name: '👥 Lutando', value: `${Object.keys(a.dano || {}).length}`, inline: true },
      { name: '🏆 Maior dano', value: top },
    )
    .setImage(Dragao.URL);
}

function botoes(desligados) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('chefe:atacar').setLabel('Atacar').setEmoji('⚔️').setStyle(ButtonStyle.Danger).setDisabled(!!desligados),
    new ButtonBuilder().setCustomId('chefe:forte').setLabel('Golpe forte').setEmoji('💥').setStyle(ButtonStyle.Primary).setDisabled(!!desligados),
    new ButtonBuilder().setCustomId('chefe:placar').setLabel('Placar').setEmoji('📊').setStyle(ButtonStyle.Secondary).setDisabled(!!desligados),
  );
}

function textoPlacar(a, max = 15) {
  const total = Object.values(a.dano || {}).reduce((x, y) => x + y, 0) || 1;
  const linhas = rank(a).slice(0, max).map(([u, d], i) => `${i + 1}. <@${u}> — ${fmt(d)} (${Math.round((d / total) * 100)}%) · ${(a.golpes && a.golpes[u]) || 0} golpes`);
  return linhas.join('\n') || 'Ninguém atacou ainda.';
}

// ---------- Invocar ----------
async function invocar(guild, cfg) {
  const canal = guild.channels.cache.get(cfg.canalId);
  if (!canal) return { erro: 'Canal não encontrado.' };
  if (ativo()) return { erro: 'Já existe um chefe ativo.' };
  const agora = Date.now();
  const a = {
    id: proximoId(), guildId: guild.id, nome: cfg.nome, emoji: cfg.emoji || '👹',
    hpMax: cfg.hp, hp: cfg.hp, inicio: agora, fim: agora + cfg.duracaoMs,
    canalId: canal.id, premio: cfg.premio, xp: cfg.xp, dano: {}, golpes: {}, cd: {}, cdForte: {},
  };
  try {
    const msg = await canal.send({
      content: cfg.cargoId ? `<@&${cfg.cargoId}>` : undefined,
      embeds: [embedChefe(a)],
      components: [botoes()],
      files: [Dragao.anexo()],
      allowedMentions: cfg.cargoId ? { roles: [cfg.cargoId] } : { parse: [] },
    });
    a.msgId = msg.id;
  } catch {
    return { erro: 'Não consegui enviar a mensagem no canal (falta permissão?).' };
  }
  salvarAtivo(a);
  return { ok: true, a };
}

// ---------- Atacar ----------
function dano(j, forte) {
  let d = R.ataque(j) * (0.8 + Math.random() * 0.4);
  const crit = Math.random() * 100 < R.critChance(j);
  if (crit) d *= 1.8;
  if (forte) d *= 2.5;
  return { dano: Math.max(1, Math.round(d)), crit };
}

const timers = new Map();
function atualizarDepois(client) {
  if (timers.has('x')) return;
  timers.set('x', setTimeout(async () => {
    timers.delete('x');
    const a = ativo();
    if (!a) return;
    const guild = client.guilds.cache.get(a.guildId);
    const canal = guild && guild.channels.cache.get(a.canalId);
    const msg = canal && (await canal.messages.fetch(a.msgId).catch(() => null));
    if (msg) await msg.edit({ embeds: [embedChefe(a)], components: [botoes()] }).catch(() => {});
  }, 4000));
}

// Retorna { erro } ou { dano, crit, hp, hpMax, derrotou }
async function atacar(client, uid, forte) {
  const a = ativo();
  if (!a || a.finalizando) return { erro: 'Não há nenhum chefe para atacar agora.' };
  const agora = Date.now();
  if (agora >= a.fim) return { erro: 'O tempo desse chefe já acabou.' };
  const j = R.obter(uid);
  if (!j) return { erro: S.SEM_RPG };
  const chaveCd = forte ? 'cdForte' : 'cd';
  const falta = (a[chaveCd][uid] || 0) - agora;
  if (falta > 0) return { erro: `⏳ Espere ${fmtSeg(falta)} para ${forte ? 'usar o golpe forte' : 'atacar'} de novo.` };

  const r = dano(j, forte);
  a.hp = Math.max(0, a.hp - r.dano);
  a.dano[uid] = (a.dano[uid] || 0) + r.dano;
  a.golpes[uid] = (a.golpes[uid] || 0) + 1;
  a[chaveCd][uid] = agora + (forte ? CD_FORTE : CD_ATAQUE);
  if (a.hp === 0) a.ultimoUid = uid;
  salvarAtivo(a);

  const derrotou = a.hp === 0;
  if (derrotou) await finalizar(client, 'vitoria');
  else atualizarDepois(client);
  return { dano: r.dano, crit: r.crit, hp: a.hp, hpMax: a.hpMax, derrotou };
}

// ---------- Encerrar ----------
async function finalizar(client, tipo, agora = Date.now()) {
  const a = ativo();
  if (!a || a.finalizando) return;
  a.finalizando = true;
  salvarAtivo(a);

  const lista = rank(a);
  const total = lista.reduce((s, [, d]) => s + d, 0) || 1;
  const mvp = lista[0] ? lista[0][0] : null;
  const ganhos = [];
  for (const [uid, d] of lista) {
    const parte = d / total;
    let stars;
    let xp;
    if (tipo === 'vitoria') {
      stars = Math.round(a.premio * parte) + 20;
      xp = Math.round(a.xp * parte) + 10;
      if (uid === a.ultimoUid) stars += Math.round(a.premio * 0.1);
      if (uid === mvp) stars += Math.round(a.premio * 0.15);
    } else {
      stars = Math.round(a.premio * 0.2 * parte) + 20;
      xp = Math.round(a.xp * 0.2 * parte) + 10;
    }
    const j = R.obter(uid);
    if (j) {
      j.moedas += stars;
      R.ganharXp(j, xp);
      R.salvar(uid, j);
    }
    ganhos.push({ uid, dano: d, stars, xp });
  }

  const vars = {
    chefe: a.nome, emoji: a.emoji, hp: fmt(a.hpMax),
    ultimo: a.ultimoUid ? `<@${a.ultimoUid}>` : '—', mvp: mvp ? `<@${mvp}>` : '—',
  };
  const m = mensagem(tipo === 'vitoria' ? 'vitoria' : 'fuga');
  const emb = new EmbedBuilder()
    .setColor(tipo === 'vitoria' ? 0x57f287 : 0x99aab5)
    .setTitle(preencher(m.titulo, vars))
    .setDescription(preencher(m.texto, vars));
  const linhas = ganhos.slice(0, 10).map((g, i) => `${i + 1}. <@${g.uid}> — ${fmt(g.dano)} dano → ⭐ ${fmt(g.stars)} · ✨ ${fmt(g.xp)}`);
  emb.addFields({ name: `Resultado (${ganhos.length} lutador(es))`, value: linhas.join('\n') || 'Ninguém lutou.' });

  const guild = client.guilds.cache.get(a.guildId);
  const canal = guild && guild.channels.cache.get(a.canalId);
  if (canal) {
    const msg = await canal.messages.fetch(a.msgId).catch(() => null);
    if (msg) await msg.edit({ embeds: [embedChefe(a)], components: [botoes(true)] }).catch(() => {});
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] } }).catch(() => {});
  }

  const hist = db.get('chefe.historico', []) || [];
  hist.push({ nome: a.nome, emoji: a.emoji, resultado: tipo, quando: agora, mvp, lutadores: ganhos.length, hpMax: a.hpMax });
  db.set('chefe.historico', hist.slice(-10));
  db.remover('chefe.ativo');
}

async function cancelar(client) {
  const a = ativo();
  if (!a) return false;
  const guild = client.guilds.cache.get(a.guildId);
  const canal = guild && guild.channels.cache.get(a.canalId);
  if (canal) {
    const msg = await canal.messages.fetch(a.msgId).catch(() => null);
    if (msg) await msg.edit({ content: '🚫 Esse evento de chefe foi cancelado pela staff.', embeds: [embedChefe(a)], components: [botoes(true)] }).catch(() => {});
  }
  db.remover('chefe.ativo');
  return true;
}

// ---------- Verificação periódica ----------
async function tick(client, agora = Date.now()) {
  const a = ativo();
  if (a && !a.finalizando && agora >= a.fim) await finalizar(client, 'fuga', agora);
  else if (a && a.finalizando) db.remover('chefe.ativo'); // sobrou de um reinício no meio do encerramento

  for (const ag of agenda()) {
    if (ag.quando > agora) continue;
    if (ativo()) {
      db.set(`chefe.agenda.${ag.id}`, { ...ag, quando: agora + 10 * 60000 }); // espera o chefe atual terminar
      continue;
    }
    const guild = client.guilds.cache.get(ag.guildId);
    db.remover(`chefe.agenda.${ag.id}`);
    if (guild) await invocar(guild, ag.cfg);
  }
}

module.exports = {
  PADROES, CD_ATAQUE, CD_FORTE, mensagem, fmt, ativo, agenda, proximoId, rank,
  embedChefe, botoes, textoPlacar, invocar, atacar, finalizar, cancelar, tick,
};
