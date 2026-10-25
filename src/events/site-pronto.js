const S = require('../site/sincronia');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    if (!process.env.GITHUB_TOKEN) {
      console.log('[Site] GITHUB_TOKEN não definido no .env: o site de configuração está desligado.');
      return;
    }
    setTimeout(() => S.ciclo(client), 10 * 1000);
    setInterval(() => S.ciclo(client), 30 * 1000);
    console.log('[Site] sincronização com o GitHub iniciada');
  },
};
