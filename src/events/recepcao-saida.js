const db = require('../db');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    const sessao = db.get(`recepcao.sessoes.${member.id}`);
    if (!sessao) return;
    const canal = await member.guild.channels.fetch(sessao.canalId).catch(() => null);
    if (canal) await canal.delete('Membro saiu do servidor').catch(() => {});
    db.remover(`recepcao.sessoes.${member.id}`);
  },
};
