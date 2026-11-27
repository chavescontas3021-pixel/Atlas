const { ActivityType } = require('discord.js');

const TEXTO = 'Marque @Atlas para pedir ajuda';
const STATUS = 'online';
const TROCA_MS = 30 * 1000;

const ATIVIDADES = [
  { name: 'Atlas', state: TEXTO, type: ActivityType.Custom },
  { name: 'servidores organizados', type: ActivityType.Watching },
];

function ausente() {
  try { const N = require('../subdona/nucleo'); return N.ativo() && !!N.ausencia(); } catch { return false; }
}

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Atlas online como ${client.user.tag}`);
    let i = 0;
    const aplicar = () => {
      if (ausente()) return;
      client.user.setPresence({ activities: [ATIVIDADES[i]], status: STATUS });
      i = (i + 1) % ATIVIDADES.length;
    };
    aplicar();
    setInterval(aplicar, TROCA_MS);
  },
};
