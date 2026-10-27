const { registrar } = require('../logs/eventos');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    registrar(client);
    // Guarda todos os membros na memória, para saber "o que mudou" quando alguém é editado
    for (const guild of client.guilds.cache.values()) guild.members.fetch().catch(() => {});
    console.log('[Logs] escutando os eventos do servidor');
  },
};
