// Entrada controlada: ao ser colocada num servidor, confere se o dono está lá; senão, sai
const Entrada = require('../entrada/nucleo');
module.exports = { name: 'guildCreate', async execute(client, guild) { await Entrada.conferir(client, guild, { aoEntrar: true }).catch((e) => console.error('[Entrada]', e)); } };
