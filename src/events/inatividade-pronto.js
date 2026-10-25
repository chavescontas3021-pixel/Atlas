const N = require('../inatividade/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => N.tick(client).catch((e) => console.error('[Inatividade]', e));
    setTimeout(rodar, 15000);
    setInterval(rodar, 10 * 60 * 1000);
    console.log('[Inatividade] verificador iniciado');
  },
};
