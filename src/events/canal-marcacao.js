const N = require('../canalmarcacao/nucleo');

// Mensagem nova: sem marcação de canal = apagada
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
