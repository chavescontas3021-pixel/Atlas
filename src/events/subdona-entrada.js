// Sub dona: vigia entradas em massa (raid).
const Vigia = require('../subdona/vigia');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, membro) {
    try { await Vigia.aoEntrar(client, membro); } catch (e) { console.error('[Sub dona] raid:', e); }
  },
};
