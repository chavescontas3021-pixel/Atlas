// Automod: apaga mensagens com palavras proibidas, dá advertência e avisa quantas faltam para o banimento.
const A = require('../automod/nucleo');
const N = require('../moderacao/nucleo');
const B = require('../blacklist/nucleo');
const L = require('../logs/nucleo');

const ultimoAcerto = new Map(); // userId -> hora da última advertência (evita várias de uma vez só)

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    async function checar(msg) {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId || !msg.content) return;
      if (!A.ativo() || A.canalIgnorado(msg.channel)) return;

      const membro = msg.member || (await msg.guild.members.fetch(msg.author.id).catch(() => null));
      if (!membro || A.isento(membro)) return;

      const achou = A.detectar(msg.content);
      if (!achou) return;

      await msg.delete().catch(() => {});

      // Se mandou várias seguidas, apaga todas mas só dá uma advertência
      const agora = Date.now();
      const repetido = agora - (ultimoAcerto.get(membro.id) || 0) < 5000;
      ultimoAcerto.set(membro.id, agora);

      await N.registrar(msg.guild, {
        titulo: '🤖 Automod bloqueou uma mensagem',
        cor: N.COR.aviso,
        alvo: msg.author,
        executor: client.user,
        motivo: `Palavra proibida (${achou.categoria})`,
        extras: [
          { name: 'Canal', value: `<#${msg.channel.id}>`, inline: true },
          { name: 'Termo', value: `\`${L.corta(achou.termo, 100)}\``, inline: true },
          { name: 'Mensagem', value: L.corta(L.vazio(msg.content), 1000) },
        ],
      });

      if (B.esta(msg.author.id)) {
        await B.alertar(msg.guild, msg.author.id, '🚨 Falou palavra proibida', `Categoria: **${achou.categoria}**`, [
          ['Canal', `<#${msg.channel.id}>`, true],
          ['Mensagem', L.corta(L.vazio(msg.content), 900)],
        ]);
      }

      if (repetido) return;

      const r = await N.darAviso(msg.guild, client.user, membro, `Automod: palavra proibida (${achou.categoria})`, null);

      let texto;
      if (r.total >= r.limite) {
        texto = r.banido && r.banido.ok
          ? `🔨 ${membro}, sua mensagem foi bloqueada e você chegou a **${r.total}/${r.limite}** advertências: foi **banido(a)**.`
          : `🚫 ${membro}, sua mensagem foi bloqueada e você chegou ao limite de advertências (**${r.total}/${r.limite}**). A staff foi avisada.`;
      } else {
        const faltam = r.limite - r.total;
        texto =
          `🚫 ${membro}, sua mensagem foi bloqueada por conter conteúdo proibido (**${achou.categoria}**).\n` +
          `⚠️ Você recebeu uma **advertência** (**${r.total}/${r.limite}**). ` +
          `Com mais **${faltam}** advertência${faltam > 1 ? 's' : ''}, você será **banido(a)**.`;
      }

      const aviso = await msg.channel
        .send({ content: texto, allowedMentions: { users: [membro.id] } })
        .catch(() => null);
      if (aviso) setTimeout(() => aviso.delete().catch(() => {}), 20000);
    }

    const seguro = (nome, fn) => (...args) =>
      Promise.resolve().then(() => fn(...args)).catch((e) => console.error(`[Automod] ${nome}:`, e));

    client.on('messageCreate', seguro('messageCreate', (msg) => checar(msg)));

    client.on('messageUpdate', seguro('messageUpdate', async (antes, depois) => {
      let nova = depois;
      if (nova.partial) nova = await nova.fetch().catch(() => null);
      if (!nova || (antes.content !== null && antes.content === nova.content)) return;
      await checar(nova);
    }));

    console.log('[Automod] ligado');
  },
};
