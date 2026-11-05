const Limpeza = require('../recepcao/limpeza');

// Qualquer mensagem (do membro ou da staff) numa recepção conta como atividade
module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;
    const achada = Object.entries(Limpeza.sessoes()).find(([, s]) => s.canalId === message.channelId);
    if (!achada) return;
    await Limpeza.registrarAtividade(client, achada[0]).catch((e) => console.error('[Limpeza]', e.message));
  },
};
