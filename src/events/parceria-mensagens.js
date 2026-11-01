const N = require('../parceria/nucleo');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const convite = N.acharConvite(message.content);
    if (!convite) return;

    // Quais parcerias estão ligadas neste canal
    const tipos = Object.keys(N.TIPOS).filter((tipo) => {
      const c = N.conf(tipo);
      return c.ativo && c.canal && c.canal === message.channelId;
    });
    if (!tipos.length) return;

    const promotorId = message.author.id;
    const representanteId = N.acharRepresentante(message);
    const servidorParceiro = await N.servidorDoConvite(client, convite);

    // O ponto vale uma vez por mensagem (mesmo que as duas parcerias estejam neste canal).
    // Soma antes de enviar para a mensagem já mostrar o total novo; se nada for enviado, desfaz.
    const pontos = N.somarPonto(promotorId);
    const rank = N.rankDe(promotorId);

    let enviou = false;
    for (const tipo of tipos) {
      try {
        await message.channel.send(
          N.montar(tipo, {
            membroId: promotorId,
            convite,
            servidor: message.guild.name,
            servidorParceiro,
            representanteId,
            pontos,
            rank,
          })
        );
        enviou = true;
      } catch (erro) {
        console.error(`[Parceria] não consegui enviar (${tipo}):`, erro.message);
        await message.react('⚠️').catch(() => {});
      }
    }
    if (!enviou) N.somarPonto(promotorId, -1);
  },
};
