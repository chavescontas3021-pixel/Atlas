const db = require('../db');
const N = require('../moderacao/nucleo');

// Tópico de advertência: só o membro advertido e a staff podem escrever. O resto é apagado.
module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      if (!message.guild || message.author.bot || message.system) return;
      if (!message.channel.isThread || !message.channel.isThread()) return;
      const topico = db.get(`moderacao.topicos.${message.channel.id}`, null);
      if (!topico) return;
      if (message.author.id === topico.membro) return;

      const membro = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
      if (N.ehStaffTopico(membro)) return;

      await message.delete().catch((e) => console.error('[Advertência] não consegui apagar mensagem do tópico:', e.message));
    } catch (erro) {
      console.error('[Advertência] tópico:', erro.message);
    }
  },
};
