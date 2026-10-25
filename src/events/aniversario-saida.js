const db = require('../db');

// Quando alguém sai do servidor, apaga o aniversário cadastrado
module.exports = {
  name: 'guildMemberRemove',
  once: false,
  execute(client, member) {
    db.remover(`aniversario.datas.${member.id}`);
    db.remover(`aniversario.ativos.${member.id}`);
  },
};
