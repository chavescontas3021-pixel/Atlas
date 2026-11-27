const Vigia = require('../subdona/vigia');
const Rotinas = require('../subdona/rotinas');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, membro) {
    try { await Vigia.aoEntrar(client, membro); } catch (e) { console.error('[Sub dona] raid:', e); }
    try { await Rotinas.aoEntrar(client, membro); } catch (e) { console.error('[Sub dona] cargo de entrada:', e); }
  },
};
