const N = require('../destaque/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,

  execute(client) {
    const rodar = async () => {
      try {
        if (typeof N.ciclo !== 'function') {
          console.error(
            '[Destaque] Erro: N.ciclo não é uma função.',
            'Exportações disponíveis:',
            Object.keys(N)
          );
          return;
        }

        await N.ciclo(client);
      } catch (e) {
        console.error('[Destaque] Erro ao executar o ciclo:', e);
      }
    };

    setTimeout(rodar, 30000);
    setInterval(rodar, 10 * 60 * 1000);

    console.log('[Destaque] Verificação do mês iniciada');
  },
};
