const Ronda = require('../subdona/ronda');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => Ronda.tick(client).catch((e) => console.error('[Sub dona] ronda:', e));
    setTimeout(rodar, 30000);
    setInterval(rodar, 5 * 60 * 1000);
    console.log('[Sub dona] ronda iniciada');
  },
};
