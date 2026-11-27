const { ActivityType } = require('discord.js');
const N = require('./nucleo');

let atual = null;
let original = null;

function guardarOriginal(client) {
  if (original) return;
  const p = client.user.presence;
  original = {
    status: (p && p.status) || 'online',
    activities: ((p && p.activities) || []).map((a) => ({ name: a.name, state: a.state || undefined, type: a.type, url: a.url || undefined })),
  };
}

function atualizar(client) {
  try {
    if (!client || !client.user || typeof client.user.setPresence !== 'function') return;
    const querAusente = N.ativo() && !!N.ausencia();
    const alvo = querAusente ? 'ausente' : 'normal';
    if (alvo === atual) return;
    if (querAusente) {
      guardarOriginal(client);
      const aus = N.ausencia();
      client.user.setPresence({ status: 'idle', activities: [{ name: 'Atlas', type: ActivityType.Custom, state: `👑 Responsável ausente${aus.motivo ? ` (${aus.motivo})`.slice(0, 60) : ''} · sub dona no comando` }] });
    } else if (original) {
      client.user.setPresence(original);
    }
    atual = alvo;
  } catch (e) { console.error('[Sub dona] presença:', e.message); }
}

function iniciar(client) {
  N.aoMudarAusencia(() => atualizar(client));
  setTimeout(() => atualizar(client), 10000);
}

module.exports = { atualizar, iniciar };
