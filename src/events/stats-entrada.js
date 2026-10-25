const N = require('../stats/nucleo');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  execute(client, member) {
    if (member.user && member.user.bot) return;
    N.registrarEntrada();
  },
};
