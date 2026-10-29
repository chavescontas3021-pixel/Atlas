// Placar fixo: uma embed num canal que se atualiza sozinha (nível, stars, vitórias e MVPs).
const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');
const { CLASSES } = require('../rpg/dados');

const TOP = 10;
const MEDALHAS = ['🥇', '🥈', '🥉'];
const fmt = (n) => Number(n).toLocaleString('pt-BR');
const cfg = () => db.get('config.ranking', null);

// MVP de chefe: chamado quando um chefe é derrotado
function registrarMvp(uid) {
  if (!uid) return;
  db.set(`ranking.mvps.${uid}`, db.get(`ranking.mvps.${uid}`, 0) + 1);
}

function coluna(lista, texto) {
  if (!lista.length) return 'Ninguém ainda.';
  return lista.map(([uid, j, v], i) => `${MEDALHAS[i] || `**${i + 1}.**`} <@${uid}> · ${texto(j, v)}`).join('\n').slice(0, 1020);
}

function montar() {
  const todos = Object.entries(R.todos());
  const top = (valor, filtro = () => true) => todos
    .map(([uid, j]) => [uid, j, valor(j, uid)])
    .filter(([, , v]) => v > 0 && filtro(v))
    .sort((a, b) => b[2] - a[2] || b[1].nivel - a[1].nivel)
    .slice(0, TOP);

  const nivel = todos.map(([uid, j]) => [uid, j, j.nivel * 1e9 + j.xp]).sort((a, b) => b[2] - a[2]).slice(0, TOP);
  const stars = top((j) => j.moedas);
  const vitorias = top((j) => j.vitorias);
  const mvpsObj = db.get('ranking.mvps', {}) || {};
  const mvps = Object.entries(mvpsObj)
    .filter(([uid, n]) => n > 0 && R.obter(uid))
    .map(([uid, n]) => [uid, R.obter(uid), n])
    .sort((a, b) => b[2] - a[2])
    .slice(0, TOP);

  const cl = (j) => (CLASSES[j.classe] ? CLASSES[j.classe].emoji : '⚔️');
  return new EmbedBuilder()
    .setColor(R.COR)
    .setTitle('🏆 Placar da House')
    .setDescription('Atualiza sozinho. Quem joga mais, sobe mais! 💜')
    .addFields(
      { name: '📈 Nível', value: coluna(nivel, (j) => `${cl(j)} Nv **${j.nivel}**`), inline: true },
      { name: '⭐ Stars', value: coluna(stars, (j, v) => `**${fmt(v)}**`), inline: true },
      { name: '', value: '', inline: true },
      { name: '⚔️ Vitórias', value: coluna(vitorias, (j, v) => `**${fmt(v)}**`), inline: true },
      { name: '👑 MVPs de chefe', value: coluna(mvps, (j, v) => `**${v}**`), inline: true },
      { name: '', value: '', inline: true },
    )
    .setFooter({ text: 'Atualizado' })
    .setTimestamp();
}

let ultimo = '';

// Edita a mensagem fixa (ou cria de novo se foi apagada). Retorna { ok } ou { erro }
async function atualizar(client, forcar = false) {
  const c = cfg();
  if (!c || !c.canalId) return { erro: 'Placar não configurado.' };
  const canal = await client.channels.fetch(c.canalId).catch(() => null);
  if (!canal) return { erro: 'Não achei o canal do placar.' };
  const emb = montar();
  const chave = JSON.stringify(emb.toJSON().fields);
  if (!forcar && chave === ultimo && c.msgId) return { ok: true, igual: true };
  let msg = c.msgId ? await canal.messages.fetch(c.msgId).catch(() => null) : null;
  try {
    if (msg) await msg.edit({ embeds: [emb] });
    else {
      msg = await canal.send({ embeds: [emb] });
      db.set('config.ranking', { ...c, msgId: msg.id });
    }
  } catch {
    return { erro: 'Não consegui enviar/editar no canal (falta permissão?).' };
  }
  ultimo = chave;
  return { ok: true };
}

module.exports = { cfg, montar, atualizar, registrarMvp };
// fim do arquivo
