const N = require('../parceria/nucleo');
const C = require('../parceria/convites');

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
    let primeiraEnviada = null;
    for (const tipo of tipos) {
      try {
        const enviada = await message.channel.send(
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
        if (!primeiraEnviada) primeiraEnviada = enviada;
      } catch (erro) {
        console.error(`[Parceria] não consegui enviar (${tipo}):`, erro.message);
        await message.react('⚠️').catch(() => {});
      }
    }
    if (!enviou) {
      N.somarPonto(promotorId, -1);
      return;
    }

    // Guarda o convite para o vigia conferir depois (se falhar, a parceria não é afetada)
    try {
      C.registrar({
        codigo: C.codigoDe(convite),
        servidor: servidorParceiro,
        promotorId,
        canalId: message.channelId,
        msgId: primeiraEnviada ? primeiraEnviada.id : message.id,
      });
    } catch (erro) {
      console.error('[Convites] não consegui registrar:', erro.message);
    }
  },
};
