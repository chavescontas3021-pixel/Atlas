const N = require('../vagas/nucleo');
const db = require('../db');

// Quando alguém sai do servidor, libera as vagas dela e apaga os pedidos
module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    try {
      for (const p of N.pedidos()) if (p.userId === member.id) db.remover(`vagas.pedidos.${p.id}`);
      const minhas = N.doUsuario(member.id);
      for (const v of minhas) await N.liberar(member.guild, v);
    } catch (err) {
      console.error('[Vagas] saída:', err);
    }
  },
};
