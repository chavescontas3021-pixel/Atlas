const K = require('../ranking/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    const rodar = () => K.atualizar(client).catch((e) => console.error('[Ranking]', e));
    setTimeout(rodar, 20000);
    setInterval(rodar, 5 * 60 * 1000);
    console.log('[Ranking] placar fixo iniciado');
  },
};
// fim do arquivo
