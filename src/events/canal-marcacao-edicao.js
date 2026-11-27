const N = require('../canalmarcacao/nucleo');

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
