const db = require('../db');
const F = require('../livraria/fluxo');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const sessao = db.get(`livraria.sessoes.${message.author.id}`);
    if (!sessao || sessao.canalId !== message.channelId) return;

    try {
      await F.receberMensagem(message, sessao);
    } catch (erro) {
      console.error('[Livraria] erro ao ler mensagem:', erro);
    }
  },
};
