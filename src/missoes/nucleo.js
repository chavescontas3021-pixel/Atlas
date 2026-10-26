// Missões diárias/semanais e conquistas (ligadas ao RPG da house).
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');

const COR = 0xf5a3c7;
const BRT = 3 * 3600 * 1000; // Brasília = UTC-3
const DIA = 24 * 3600 * 1000;

const PADROES = {
  mensagens: {
    conquista: {
      titulo: '🏅 Conquista desbloqueada!',
      texto: '{usuario} desbloqueou **{emoji} {conquista}**!\n_{desc}_\n⭐ +{stars} stars',
    },
  },
};

const cfg = (chave, padrao) => db.get(`config.missoes.${chave}`, padrao);
const ativo = () => cfg('ativo', true) !== false;
const mensagem = (tipo) => ({ ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) });
const preencher = (texto, vars) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

const METRICAS = {
  msgs: '💬 Enviar mensagens',
  vitorias: '⚔️ Vencer batalhas',
  treinar: '🏋️ Treinar',
  explorar: '🗺️ Explorar',
  diario: '🎁 Pegar o /rpg diario',
  missoesDia: '📋 Completar missões diárias',
};

const DIARIAS = [
  { id: 'd_msgs30', metrica: 'msgs', alvo: 30, nome: 'Papo em dia', stars: 60, xp: 20 },
  { id: 'd_msgs80', metrica: 'msgs', alvo: 80, nome: 'Tagarela', stars: 120, xp: 40 },
  { id: 'd_vit2', metrica: 'vitorias', alvo: 2, nome: 'Aquecimento', stars: 70, xp: 25 },
  { id: 'd_vit4', metrica: 'vitorias', alvo: 4, nome: 'Caçadora do dia', stars: 130, xp: 45 },
  { id: 'd_trein2', metrica: 'treinar', alvo: 2, nome: 'Treino pesado', stars: 60, xp: 25 },
  { id: 'd_expl4', metrica: 'explorar', alvo: 4, nome: 'Aventureira', stars: 80, xp: 30 },
  { id: 'd_diario', metrica: 'diario', alvo: 1, nome: 'Presente do dia', stars: 40, xp: 10 },
];

const SEMANAIS = [
  { id: 's_msgs400', metrica: 'msgs', alvo: 400, nome: 'Alma da casa', stars: 500, xp: 150 },
  { id: 's_vit15', metrica: 'vitorias', alvo: 15, nome: 'Caçadora de monstros', stars: 600, xp: 200 },
  { id: 's_trein12', metrica: 'treinar', alvo: 12, nome: 'Rotina de treino', stars: 450, xp: 150 },
  { id: 's_expl30', metrica: 'explorar', alvo: 30, nome: 'Exploradora', stars: 500, xp: 160 },
  { id: 's_diario5', metrica: 'diario', alvo: 5, nome: 'Fiel ao presente', stars: 400, xp: 120 },
  { id: 's_missoes10', metrica: 'missoesDia', alvo: 10, nome: 'Semana produtiva', stars: 550, xp: 180 },
];

const CONQUISTAS = [
  { id: 'vit1', emoji: '🗡️', nome: 'Primeiro sangue', desc: 'Vença 1 batalha.', stars: 50, prog: (c) => [c.j.vitorias || 0, 1] },
  { id: 'vit25', emoji: '🏹', nome: 'Caçadora', desc: 'Vença 25 batalhas.', stars: 250, prog: (c) => [c.j.vitorias || 0, 25] },
  { id: 'vit100', emoji: '👑', nome: 'Lenda da house', desc: 'Vença 100 batalhas.', stars: 1000, prog: (c) => [c.j.vitorias || 0, 100] },
  { id: 'nv5', emoji: '🌱', nome: 'Crescendo', desc: 'Chegue ao nível 5.', stars: 100, prog: (c) => [c.j.nivel, 5] },
  { id: 'nv10', emoji: '🌿', nome: 'Veterana', desc: 'Chegue ao nível 10.', stars: 300, prog: (c) => [c.j.nivel, 10] },
  { id: 'nv20', emoji: '🌳', nome: 'Mestra', desc: 'Chegue ao nível 20.', stars: 1000, prog: (c) => [c.j.nivel, 20] },
  { id: 'msg100', emoji: '💬', nome: 'Conversadora', desc: 'Envie 100 mensagens.', stars: 100, prog: (c) => [c.tot.msgs || 0, 100] },
  { id: 'msg1000', emoji: '📣', nome: 'Voz da house', desc: 'Envie 1000 mensagens.', stars: 600, prog: (c) => [c.tot.msgs || 0, 1000] },
  { id: 'miss10', emoji: '📋', nome: 'Dedicada', desc: 'Complete 10 missões diárias.', stars: 200, prog: (c) => [c.tot.missoesDia || 0, 10] },
  { id: 'miss50', emoji: '🏆', nome: 'Imparável', desc: 'Complete 50 missões diárias.', stars: 800, prog: (c) => [c.tot.missoesDia || 0, 50] },
  { id: 'diario7', emoji: '🎁', nome: 'Rotina', desc: 'Pegue o /rpg diario 7 vezes.', stars: 150, prog: (c) => [c.tot.diario || 0, 7] },
  { id: 'treino50', emoji: '🏋️', nome: 'Rato de treino', desc: 'Treine 50 vezes.', stars: 300, prog: (c) => [c.tot.treinar || 0, 50] },
  { id: 'rica', emoji: '💰', nome: 'Tesouro', desc: 'Tenha 5000 stars ao mesmo tempo.', stars: 500, prog: (c) => [c.j.moedas || 0, 5000] },
];

// ---------- Datas (Brasília) ----------
const diaChave = (ts) => new Date(ts - BRT).toISOString().slice(0, 10).replace(/-/g, '');
function diasDesdeSegunda(ts) {
  return (new Date(ts - BRT).getUTCDay() + 6) % 7;
}
const semanaChave = (ts) => diaChave(ts - diasDesdeSegunda(ts) * DIA);
const fimDoDia = (ts) => (Math.floor((ts - BRT) / DIA) + 1) * DIA + BRT;
const fimDaSemana = (ts) => (Math.floor((ts - BRT) / DIA) - diasDesdeSegunda(ts) + 7) * DIA + BRT;

function hash(txt) {
  let h = 0;
  for (const c of txt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Escolhe 3 missões do dia/semana (as mesmas para todo mundo), sem repetir o tipo
function escolher(pool, chave) {
  const ordem = [...pool].sort((a, b) => hash(chave + a.id) - hash(chave + b.id));
  const usadas = new Set();
  const out = [];
  for (const m of ordem) {
    if (usadas.has(m.metrica)) continue;
    usadas.add(m.metrica);
    out.push(m);
    if (out.length === 3) break;
  }
  return out;
}
const ativas = (periodo, chave) => escolher(periodo === 'dia' ? DIARIAS : SEMANAIS, `${periodo}${chave}`);

// ---------- Estado ----------
function estado(uid, periodo, agora = Date.now()) {
  const chave = periodo === 'dia' ? diaChave(agora) : semanaChave(agora);
  const e = db.get(`missoes.${periodo}.${uid}`, null);
  return e && e.chave === chave ? e : { chave, prog: {}, resg: [] };
}
const salvarEstado = (uid, periodo, e) => db.set(`missoes.${periodo}.${uid}`, e);
const totais = (uid) => db.get(`missoes.total.${uid}`, {}) || {};
const conquistasDe = (uid) => db.get(`missoes.conq.${uid}`, {}) || {};
const temRpg = (uid) => !!db.get(`rpg.jogadores.${uid}`, null);

async function addProgresso(client, uid, metrica, n = 1) {
  if (!ativo() || !temRpg(uid)) return;
  for (const periodo of ['dia', 'semana']) {
    const e = estado(uid, periodo);
    e.prog[metrica] = (e.prog[metrica] || 0) + n;
    salvarEstado(uid, periodo, e);
  }
  const t = totais(uid);
  t[metrica] = (t[metrica] || 0) + n;
  db.set(`missoes.total.${uid}`, t);
  await verificarConquistas(client, uid);
}

// ---------- Conquistas ----------
async function verificarConquistas(client, uid) {
  const j = R.obter(uid);
  if (!j) return [];
  const ctx = { j, tot: totais(uid) };
  const have = conquistasDe(uid);
  const novas = [];
  for (const c of CONQUISTAS) {
    if (have[c.id]) continue;
    const [atual, alvo] = c.prog(ctx);
    if (atual >= alvo) {
      have[c.id] = Date.now();
      j.moedas += c.stars;
      novas.push(c);
    }
  }
  if (!novas.length) return [];
  db.set(`missoes.conq.${uid}`, have);
  R.salvar(uid, j);
  for (const c of novas) await anunciar(client, uid, c);
  return novas;
}

async function anunciar(client, uid, c) {
  if (!client) return;
  const m = mensagem('conquista');
  const vars = { usuario: `<@${uid}>`, emoji: c.emoji, conquista: c.nome, desc: c.desc, stars: c.stars };
  const emb = new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(preencher(m.texto, vars));
  const canalId = cfg('canal');
  if (canalId) {
    for (const guild of client.guilds.cache.values()) {
      const canal = guild.channels.cache.get(canalId);
      if (canal) {
        await canal.send({ content: `<@${uid}>`, embeds: [emb], allowedMentions: { users: [uid] } }).catch(() => {});
        return;
      }
    }
  }
  const user = await client.users.fetch(uid).catch(() => null);
  if (user) await user.send({ embeds: [emb] }).catch(() => {});
}

// ---------- Resgatar ----------
// Retorna { erro } ou { feitos, stars, xp, subiu, novas }
async function resgatar(client, uid) {
  const j = R.obter(uid);
  if (!j) return { erro: 'Você precisa de um personagem de RPG para resgatar. Use `/rpg criar`.' };
  let stars = 0;
  let xp = 0;
  let diarias = 0;
  const feitos = [];
  for (const periodo of ['dia', 'semana']) {
    const e = estado(uid, periodo);
    for (const m of ativas(periodo, e.chave)) {
      if ((e.prog[m.metrica] || 0) >= m.alvo && !e.resg.includes(m.id)) {
        e.resg.push(m.id);
        stars += m.stars;
        xp += m.xp;
        feitos.push(m.nome);
        if (periodo === 'dia') diarias++;
      }
    }
    salvarEstado(uid, periodo, e);
  }
  if (!feitos.length) return { erro: 'Nenhuma missão pronta para resgatar agora.' };
  j.moedas += stars;
  const subiu = R.ganharXp(j, xp);
  R.salvar(uid, j);
  if (diarias) await addProgresso(client, uid, 'missoesDia', diarias);
  const novas = await verificarConquistas(client, uid);
  return { feitos, stars, xp, subiu, nivel: j.nivel, novas };
}

function prontas(uid) {
  let n = 0;
  for (const periodo of ['dia', 'semana']) {
    const e = estado(uid, periodo);
    for (const m of ativas(periodo, e.chave)) if ((e.prog[m.metrica] || 0) >= m.alvo && !e.resg.includes(m.id)) n++;
  }
  return n;
}

// ---------- Visual ----------
function linhaMissao(m, e) {
  const p = Math.min(e.prog[m.metrica] || 0, m.alvo);
  const feita = e.resg.includes(m.id);
  const status = feita ? '✅ resgatada' : p >= m.alvo ? '🎁 pronta!' : '';
  return `**${m.nome}** — ${METRICAS[m.metrica]}: ${R.barra(p, m.alvo, 8)} ${p}/${m.alvo}\n⭐ ${m.stars} · ✨ ${m.xp} XP ${status}`;
}

function embedMissoes(uid) {
  const agora = Date.now();
  const d = estado(uid, 'dia');
  const s = estado(uid, 'semana');
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle('📋 Suas missões')
    .addFields(
      { name: `☀️ Diárias — reinicia <t:${Math.floor(fimDoDia(agora) / 1000)}:R>`, value: ativas('dia', d.chave).map((m) => linhaMissao(m, d)).join('\n\n') },
      { name: `📅 Semanais — reinicia <t:${Math.floor(fimDaSemana(agora) / 1000)}:R>`, value: ativas('semana', s.chave).map((m) => linhaMissao(m, s)).join('\n\n') },
    )
    .setFooter({ text: 'O progresso conta mensagens e ações do /rpg.' });
}

function botoesMissoes(uid) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('missoes:resgatar').setLabel('Resgatar recompensas').setEmoji('🎁').setStyle(ButtonStyle.Success).setDisabled(prontas(uid) === 0),
  );
}

function embedConquistas(uid, nomeUsuario) {
  const have = conquistasDe(uid);
  const j = R.obter(uid);
  const ctx = { j: j || { vitorias: 0, nivel: 1, moedas: 0 }, tot: totais(uid) };
  const linhas = CONQUISTAS.map((c) => {
    if (have[c.id]) return `${c.emoji} **${c.nome}** — ${c.desc} ✅ <t:${Math.floor(have[c.id] / 1000)}:d>`;
    const [a, b] = c.prog(ctx);
    return `🔒 **${c.nome}** — ${c.desc} (${Math.min(a, b)}/${b})`;
  });
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(`🏅 Conquistas de ${nomeUsuario}`)
    .setDescription(linhas.join('\n'))
    .setFooter({ text: `${Object.keys(have).length}/${CONQUISTAS.length} desbloqueadas` });
}

// ---------- Observador do RPG ----------
const snapDe = (j) => ({ v: j.vitorias || 0, t: (j.cd && j.cd.treinar) || 0, e: (j.cd && j.cd.explorar) || 0, d: (j.cd && j.cd.diario) || 0 });

function guardarSnapshot(uid) {
  const j = db.get(`rpg.jogadores.${uid}`, null);
  if (j && !db.get(`missoes.snap.${uid}`, null)) db.set(`missoes.snap.${uid}`, snapDe(j));
}

// Compara o estado do RPG com o que vimos da última vez e conta o que mudou
async function aplicarDelta(client, uid) {
  if (!ativo()) return;
  const j = db.get(`rpg.jogadores.${uid}`, null);
  if (!j) return;
  const atual = snapDe(j);
  let ant = db.get(`missoes.snap.${uid}`, null);
  db.set(`missoes.snap.${uid}`, atual);
  if (!ant) {
    if (Date.now() - (j.criadoEm || 0) > 60000) return; // jogador antigo: só marca o ponto de partida
    ant = { v: 0, t: 0, e: 0, d: 0 };
  }
  if (atual.v > ant.v) await addProgresso(client, uid, 'vitorias', atual.v - ant.v);
  if (atual.t > ant.t) await addProgresso(client, uid, 'treinar', 1);
  if (atual.e > ant.e) await addProgresso(client, uid, 'explorar', 1);
  if (atual.d > ant.d) await addProgresso(client, uid, 'diario', 1);
  await verificarConquistas(client, uid);
}

function observarRpg(client, uid) {
  setTimeout(() => aplicarDelta(client, uid).catch((e) => console.error('[Missões]', e)), 1500);
}

module.exports = {
  PADROES, cfg, ativo, mensagem, METRICAS, DIARIAS, SEMANAIS, CONQUISTAS,
  diaChave, semanaChave, ativas, estado, addProgresso, verificarConquistas, resgatar, prontas,
  embedMissoes, botoesMissoes, embedConquistas, guardarSnapshot, aplicarDelta, observarRpg, temRpg,
};
