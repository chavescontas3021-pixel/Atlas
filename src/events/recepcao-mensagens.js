const db = require('../db');
const F = require('../recepcao/fluxo');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const sessao = db.get(`recepcao.sessoes.${message.author.id}`);
    if (!sessao || sessao.canalId !== message.channelId) return;

    try {
      if (sessao.etapa === 'personagem') await F.receberPersonagem(message);
      else if (sessao.etapa === 'emoji') await F.receberEmoji(message);
    } catch (erro) {
      console.error('[Recepção] erro ao ler mensagem:', erro);
    }
  },
};
