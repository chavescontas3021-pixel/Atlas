const N = require('../parceria/nucleo');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const convite = N.acharConvite(message.content);
    if (!convite) return;

    for (const tipo of Object.keys(N.TIPOS)) {
      const c = N.conf(tipo);
      if (!c.ativo || !c.canal || c.canal !== message.channelId) continue;

      try {
        await message.channel.send(
          N.montar(tipo, {
            membroId: message.author.id,
            convite,
            servidor: message.guild.name,
          })
        );
      } catch (erro) {
        console.error(`[Parceria] não consegui enviar (${tipo}):`, erro.message);
        await message.react('⚠️').catch(() => {});
      }
    }
  },
};
