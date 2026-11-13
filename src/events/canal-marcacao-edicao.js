const N = require('../canalmarcacao/nucleo');

// Mensagem editada: se a pessoa tirar a marcação de canal depois de enviar, apaga também
module.exports = {
  name: 'messageUpdate',
  async execute(client, antiga, nova) {
    try {
      const message = nova.partial ? await nova.fetch().catch(() => null) : nova;
      if (!message) return;
      await N.verificar(message);
    } catch (erro) {
      console.error('[CanalMarcação] erro na edição:', erro.message);
    }
  },
};
