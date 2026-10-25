const N = require('../inatividade/nucleo');

// Cada mensagem enviada conta como "apareceu" para quem ocupa uma vaga
module.exports = {
  name: 'messageCreate',
  once: false,
  execute(client, message) {
    if (!message.guild || !message.author || message.author.bot) return;
    N.registrarAtividade(message.author.id);
  },
};
