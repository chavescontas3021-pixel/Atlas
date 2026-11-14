// Sub dona: reconhece pagamentos de sonhos (Loritta) feitos ao pai.
const Sonhos = require('../subdona/sonhos');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try { await Sonhos.aoMensagem(client, msg); } catch (e) { console.error('[Sub dona] sonhos:', e); }
  },
};
