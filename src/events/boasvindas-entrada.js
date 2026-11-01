const N = require('../boasvindas/nucleo');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    try {
      await N.entrada(member);
    } catch (e) {
      console.error('[Boas-vindas] entrada:', e);
    }
  },
};
