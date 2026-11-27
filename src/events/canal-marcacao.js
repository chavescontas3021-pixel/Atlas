const N = require('../canalmarcacao/nucleo');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      await N.verificar(message);
    } catch (erro) {
      console.error('[CanalMarcação] erro:', erro.message);
    }
  },
};
