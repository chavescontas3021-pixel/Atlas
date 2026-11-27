const db = require('../db');

function bloqueio(interaction) {
  const canal = db.get('config.rpg.canal', null);
  const categoria = db.get('config.rpg.categoria', null);
  if (!canal && !categoria) return null;

  const id = interaction.channelId;
  if (canal && id === canal) return null;

  if (categoria) {
    let ch = interaction.channel || (interaction.guild && interaction.guild.channels.cache.get(id)) || null;
    if (ch && typeof ch.isThread === 'function' && ch.isThread()) ch = ch.parent;
    if (ch && ch.parentId === categoria) return null;
  }

  const onde = [];
  if (categoria) onde.push(`na categoria <#${categoria}>`);
  if (canal) onde.push(`no chat <#${canal}>`);
  return `🎮 Os comandos de RPG só funcionam ${onde.join(' ou ')}.`;
}

module.exports = { bloqueio };
