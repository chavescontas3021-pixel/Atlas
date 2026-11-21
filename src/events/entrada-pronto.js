// Entrada controlada: ao ligar, confere todos os servidores onde a Atlas está
const Entrada = require('../entrada/nucleo');
module.exports = {
  name: 'clientReady', once: true,
  async execute(client) { for (const g of [...client.guilds.cache.values()]) await Entrada.conferir(client, g).catch((e) => console.error('[Entrada]', e)); },
};
