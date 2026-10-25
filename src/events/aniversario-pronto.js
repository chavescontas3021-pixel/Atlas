const N = require('../aniversario/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => N.tick(client).catch((e) => console.error('[Aniversário]', e));
    setTimeout(rodar, 8000);
    setInterval(rodar, 60 * 1000);
    console.log('[Aniversário] verificador iniciado');
  },
};
