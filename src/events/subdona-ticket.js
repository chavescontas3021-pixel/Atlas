const Atendente = require('../subdona/atendente');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try { await Atendente.aoMensagem(client, msg); } catch (e) { console.error('[Sub dona] ticket:', e); }
  },
};
