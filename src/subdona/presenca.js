// ATLAS · sub dona · status do bot acompanha a sua ausência
// Com o pai ausente (e o modo sub dona ligado) o status vira "Pai ausente · sub dona no comando".
// Quando o pai volta, o status de antes é restaurado.
const { ActivityType } = require('discord.js');
const N = require('./nucleo');

let atual = null;   // 'ausente' | 'normal' (evita chamar o Discord à toa)
let original = null; // status que o bot tinha antes

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
      client.user.setPresence({ status: 'idle', activities: [{ name: 'Atlas', type: ActivityType.Custom, state: `👑 Pai ausente${aus.motivo ? ` (${aus.motivo})`.slice(0, 60) : ''} · sub dona no comando` }] });
    } else if (original) {
      client.user.setPresence(original);
    }
    atual = alvo;
  } catch (e) { console.error('[Sub dona] presença:', e.message); }
}

function iniciar(client) {
  N.aoMudarAusencia(() => atualizar(client));
  setTimeout(() => atualizar(client), 10000); // depois do ready.js definir o status normal
}

module.exports = { atualizar, iniciar };
