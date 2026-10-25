const N = require('../stats/nucleo');

module.exports = {
  name: 'messageCreate',
  once: false,
  execute(client, message) {
    if (!message.guild || !message.author || message.author.bot) return;
    // em threads, conta no canal "pai"
    const canalId = message.channel.isThread && message.channel.isThread() ? message.channel.parentId || message.channelId : message.channelId;
    N.registrarMensagem(canalId, message.author.id);
  },
};
