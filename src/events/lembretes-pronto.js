const db = require('../db');

async function verificar(client) {
  const lista = db.get('lembretes', []);
  if (!lista.length) return;
  const agora = Date.now();
  const vencidos = lista.filter((l) => l.quando <= agora);
  if (!vencidos.length) return;

  db.set('lembretes', lista.filter((l) => l.quando > agora));

  for (const l of vencidos) {
    const texto = `⏰ <@${l.userId}> lembrete: **${l.texto}**`;
    try {
      const canal = await client.channels.fetch(l.canalId);
      await canal.send({ content: texto, allowedMentions: { users: [l.userId] } });
    } catch {
      try {
        const user = await client.users.fetch(l.userId);
        await user.send(`⏰ Lembrete: **${l.texto}**`);
      } catch { /* sem como avisar */ }
    }
  }
}

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    setInterval(() => verificar(client).catch((e) => console.error('[Lembretes]', e)), 15000);
    console.log('[Lembretes] verificador iniciado');
  },
};
