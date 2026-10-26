const N = require('../chefe/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => N.tick(client).catch((e) => console.error('[Chefe]', e));
    setTimeout(rodar, 10000);
    setInterval(rodar, 15 * 1000);
    console.log('[Chefe] verificador iniciado');
  },
};
