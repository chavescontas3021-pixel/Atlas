const N = require('../destaque/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => N.ciclo(client).catch((e) => console.error('[Destaque]', e));
    setTimeout(rodar, 30000);
    setInterval(rodar, 10 * 60 * 1000);
    console.log('[Destaque] verificação do mês iniciada');
  },
};
