const N = require('../boasvindas/nucleo');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    try {
      await N.saida(member);
    } catch (e) {
      console.error('[Boas-vindas] saída:', e);
    }
  },
};
