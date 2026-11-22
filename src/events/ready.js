const { ActivityType } = require('discord.js');

// ===== MUDE AQUI =====
const TEXTO = '➺     𓈒     ❛      ╱      𝅙ִ𝅙𝐂onstruindo 𝐬ervidores 𝐩ara 𝐯ocê 𝅙ִ𝅙     Ი౧';
const JOGANDO = 'Desenvolvida por @bnkali.';
const STATUS = 'online';
const TROCA_MS = 30 * 1000; // de quanto em quanto tempo alterna entre os dois
// =====================

const ATIVIDADES = [
  { name: 'Atlas', state: TEXTO, type: ActivityType.Custom },
  { name: JOGANDO, type: ActivityType.Playing },
];

// Com o pai ausente (sub dona no comando), o status da ausência tem prioridade
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
