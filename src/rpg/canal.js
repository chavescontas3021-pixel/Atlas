// Onde os comandos de RPG podem ser usados.
// config.rpg.categoria = categoria inteira (todos os chats dentro dela, e as threads desses chats)
// config.rpg.canal     = um chat específico (opcional, funciona junto com a categoria)
// Sem nenhum dos dois configurado, o RPG funciona em todos os canais.
const db = require('../db');

// Devolve null se pode usar aqui, ou o texto de aviso se não pode
function bloqueio(interaction) {
  const canal = db.get('config.rpg.canal', null);
  const categoria = db.get('config.rpg.categoria', null);
  if (!canal && !categoria) return null;

  const id = interaction.channelId;
  if (canal && id === canal) return null;

  if (categoria) {
    let ch = interaction.channel || (interaction.guild && interaction.guild.channels.cache.get(id)) || null;
    // Thread: vale a categoria do chat onde ela foi criada
    if (ch && typeof ch.isThread === 'function' && ch.isThread()) ch = ch.parent;
    if (ch && ch.parentId === categoria) return null;
  }

  const onde = [];
  if (categoria) onde.push(`na categoria <#${categoria}>`);
  if (canal) onde.push(`no chat <#${canal}>`);
  return `🎮 Os comandos de RPG só funcionam ${onde.join(' ou ')}.`;
}

module.exports = { bloqueio };
