const db = require('../db');
const N = require('../missoes/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute() {
    const jogadores = db.get('rpg.jogadores', {}) || {};
    for (const uid of Object.keys(jogadores)) N.guardarSnapshot(uid);
    console.log('[Missões] pronto');
  },
};
