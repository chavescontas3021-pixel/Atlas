const N = require('../missoes/nucleo');

const ultimo = new Map();

// Cada mensagem conta para a missão (no máximo 1 a cada 10 segundos, para não valer spam)
module.exports = {
  name: 'messageCreate',
  once: false,
  execute(client, message) {
    if (!message.guild || !message.author || message.author.bot) return;
    const uid = message.author.id;
    N.guardarSnapshot(uid);
    const agora = Date.now();
    if (agora - (ultimo.get(uid) || 0) < 10 * 1000) return;
    ultimo.set(uid, agora);
    N.addProgresso(client, uid, 'msgs', 1).catch((e) => console.error('[Missões]', e));
  },
};
