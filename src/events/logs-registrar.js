const { registrar } = require('../logs/eventos');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    registrar(client);
    for (const guild of client.guilds.cache.values()) guild.members.fetch().catch(() => {});
    console.log('[Logs] escutando os eventos do servidor');
  },
};
