// Sub dona: vigia flood, spam de menção e golpes nas mensagens.
const Vigia = require('../subdona/vigia');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try { await Vigia.aoMensagem(client, msg); } catch (e) { console.error('[Sub dona] vigia:', e); }
  },
};
