const N = require('../eventos/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => N.tick(client).catch((e) => console.error('[Sorteios/Eventos]', e));
    setTimeout(rodar, 5000);
    setInterval(rodar, 15000);
    console.log('[Sorteios/Eventos] agendador iniciado');
  },
};
