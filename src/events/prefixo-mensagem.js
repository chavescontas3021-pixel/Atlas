const A = require('../prefixo/adaptador');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    try {
      await A.executar(client, message);
    } catch (e) {
      console.error('[Prefixo]', e);
    }
  },
};
