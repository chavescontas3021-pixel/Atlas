// Resumo diário do que os membros vigiados fizeram + limpeza das observações vencidas.
const db = require('../db');
const B = require('../blacklist/nucleo');
const L = require('../logs/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    async function verificar() {
      // Observações vencidas somem sozinhas ao serem consultadas
      B.listaObservados();

      const hora = B.resumoHora();
      if (hora === null) return;
      const hoje = B.diaLocal();
      if (db.get('config.blacklist.ultimoResumo') === hoje) return;
      if (B.horaLocal() < hora) return;

      // Marca antes de enviar, para nunca mandar duas vezes no mesmo dia
      db.set('config.blacklist.ultimoResumo', hoje);

      const ontem = B.diaLocal(-1);
      const alvos = [
        ...B.lista().map((d) => ({ id: d.id, tipo: '🕵️' })),
        ...B.listaObservados().map((d) => ({ id: d.id, tipo: '👁️' })),
      ];
      const linhas = [];
      for (const a of alvos) {
        const e = B.estatisticas(a.id, ontem);
        if (!e.total && !e.suspeitos && !e.automod) continue;
        linhas.push(`${a.tipo} <@${a.id}> — ${e.total} ações, 🚨 ${e.suspeitos} suspeitas, 🤖 ${e.automod} bloqueios do automod`);
      }
      if (!linhas.length) return;

      const emb = L.embed(B.COR.info, `📊 Resumo de ontem (${ontem})`, L.corta(linhas.join('\n'), 3900), []);
      emb.setFooter({ text: '🕵️ blacklist · 👁️ em observação' });
      for (const guild of client.guilds.cache.values()) {
        if (await B.enviarCanal(guild, emb)) break;
      }
    }

    const rodar = () => verificar().catch((e) => console.error('[Blacklist] resumo:', e));
    setInterval(rodar, 60 * 1000);
    setTimeout(rodar, 15 * 1000);
    console.log('[Blacklist] resumo diário agendado');
  },
};
