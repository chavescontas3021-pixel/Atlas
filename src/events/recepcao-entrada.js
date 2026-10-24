const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    if (member.user.bot) return;
    if (!U.cfg('ativo', false)) return;
    try {
      await F.iniciarRecepcao(member);
    } catch (erro) {
      console.error('[Recepção] erro ao iniciar:', erro);
    }
  },
};
