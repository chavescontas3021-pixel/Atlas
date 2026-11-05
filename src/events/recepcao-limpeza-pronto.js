const Limpeza = require('../recepcao/limpeza');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => Limpeza.tick(client).catch((e) => console.error('[Limpeza]', e));
    setTimeout(rodar, 45 * 1000);
    setInterval(rodar, 5 * 60 * 1000);
    console.log('[Limpeza] verificador de recepções iniciado');
  },
};
