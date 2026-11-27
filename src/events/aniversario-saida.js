const db = require('../db');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  execute(client, member) {
    db.remover(`aniversario.datas.${member.id}`);
    db.remover(`aniversario.ativos.${member.id}`);
  },
};
