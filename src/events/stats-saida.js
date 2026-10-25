const N = require('../stats/nucleo');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  execute(client, member) {
    if (member.user && member.user.bot) return;
    N.registrarSaida();
  },
};
