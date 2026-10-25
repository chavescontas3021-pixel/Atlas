const N = require('../stats/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    setInterval(() => N.flush(), 30 * 1000);
    setInterval(() => N.limpar(), 6 * 3600 * 1000);
    const contador = () => N.contadorTick(client).catch((e) => console.error('[Stats]', e));
    setTimeout(contador, 20000);
    setInterval(contador, 10 * 60 * 1000);
    console.log('[Stats] registro iniciado');
  },
};
