// Automod: apaga mensagens proibidas, dá advertência (ou só avisa, se for leve) e vigia nomes de membros.
const A = require('../automod/nucleo');
const N = require('../moderacao/nucleo');
const B = require('../blacklist/nucleo');
const L = require('../logs/nucleo');

const ultimoAcerto = new Map(); // userId -> hora da última punição (evita várias advertências de uma vez)
const leves = new Map(); // userId -> horas dos últimos acertos leves
const LEVES_PARA_ADVERTIR = 3; // 3 mensagens leves em 1 hora viram 1 advertência
const JANELA_LEVE = 60 * 60 * 1000;

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    async function checar(msg) {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId) return;
      const anexos = msg.attachments ? [...msg.attachments.values()].map((a) => a.name || '') : [];
      if (!msg.content && !anexos.length) return;
      if (!A.ativo() || A.canalIgnorado(msg.channel)) return;

      const membro = msg.member || (await msg.guild.members.fetch(msg.author.id).catch(() => null));
      if (!membro) return;

      // Quem está na blacklist nunca é isento: o automod é mais duro com ele
      const vigiado = B.esta(msg.author.id);
      if (!vigiado && A.isento(membro)) return;

      const achou = A.detectar(msg.content) || A.detectar(anexos.join(' '));
      if (!achou) return;

      await msg.delete().catch(() => {});

      const agora = Date.now();
      const repetido = agora - (ultimoAcerto.get(membro.id) || 0) < 5000;
      ultimoAcerto.set(membro.id, agora);

      // Decide se isto vale advertência
      let advertir = achou.advertir;
      let faltamLeves = 0;
      if (!repetido && !advertir) {
        if (vigiado || A.modoLeve() === 'advertir') {
          advertir = true;
        } else {
          const recentes = (leves.get(membro.id) || []).filter((t) => agora - t < JANELA_LEVE);
          recentes.push(agora);
          if (recentes.length >= LEVES_PARA_ADVERTIR) {
            advertir = true;
            leves.delete(membro.id);
          } else {
            leves.set(membro.id, recentes);
            faltamLeves = LEVES_PARA_ADVERTIR - recentes.length;
          }
        }
      }

      await N.registrar(msg.guild, {
        titulo: '🤖 Automod bloqueou uma mensagem',
        cor: N.COR.aviso,
        alvo: msg.author,
        executor: client.user,
        motivo: `${achou.categoria}${achou.advertir ? '' : ' (leve)'}`,
        extras: [
          { name: 'Canal', value: `<#${msg.channel.id}>`, inline: true },
          { name: 'Termo', value: `\`${L.corta(achou.termo, 100)}\``, inline: true },
          { name: 'Mensagem', value: L.corta(L.vazio(msg.content || anexos.join(', ')), 1000) },
        ],
      });

      // Conexão com a blacklist: guarda a ocorrência (4 em 24h = observação) e alerta se for vigiado
      await B.registrarOcorrencia(msg.guild, msg.author.id, { categoria: achou.categoria, grave: achou.advertir });
      await B.alertar(msg.guild, msg.author.id, '🚨 Falou algo proibido', `Categoria: **${achou.categoria}**`, [
        ['Canal', `<#${msg.channel.id}>`, true],
        ['Mensagem', L.corta(L.vazio(msg.content || anexos.join(', ')), 900)],
      ]);

      if (repetido) return;

      let texto;
      if (advertir) {
        const r = await N.darAviso(msg.guild, client.user, membro, `Automod: ${achou.categoria}`, null);
        if (r.banido && r.banido.ok) {
          await B.observarEAvisar(msg.guild, membro.id, 'Banido pelo automod (se voltar ao servidor, o Atlas avisa)', 30);
        } else if (r.total >= 2) {
          await B.observarEAvisar(msg.guild, membro.id, `Chegou a ${r.total}/${r.limite} advertências`, 14);
        }
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
      } else {
        texto =
          `🚫 ${membro}, sua mensagem foi apagada: **${achou.categoria}** não é permitido aqui.\n` +
          `Se repetir, mais **${faltamLeves}** mensagem${faltamLeves > 1 ? 's' : ''} assim e você leva uma advertência.`;
      }

      const aviso = await msg.channel.send({ content: texto, allowedMentions: { users: [membro.id] } }).catch(() => null);
      if (aviso) setTimeout(() => aviso.delete().catch(() => {}), 20000);
    }

    // Nome ou apelido impróprio: troca o apelido (sem advertência)
    async function checarNome(membro) {
      if (!A.ativo() || !A.nomesAtivo() || membro.user.bot) return;
      if (!B.esta(membro.id) && A.isento(membro)) return;
      const achou = A.detectar(membro.displayName);
      if (!achou) return;

      const trocou = membro.manageable
        ? await membro.setNickname('Nome moderado', 'Automod: nome impróprio').then(() => true).catch(() => false)
        : false;

      await N.registrar(membro.guild, {
        titulo: '🤖 Automod: nome impróprio',
        cor: N.COR.aviso,
        alvo: membro.user,
        executor: client.user,
        motivo: `${achou.categoria} — ${trocou ? 'apelido trocado para "Nome moderado"' : 'não consegui trocar o apelido (falta permissão ou cargo mais alto)'}`,
        extras: [{ name: 'Nome', value: L.corta(L.vazio(membro.displayName), 200) }],
      });

      if (B.esta(membro.id)) {
        await B.alertar(membro.guild, membro.id, '🚨 Nome impróprio', `Categoria: **${achou.categoria}**`, [
          ['Nome', L.corta(L.vazio(membro.displayName), 200)],
        ]);
      }
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

    client.on('guildMemberAdd', seguro('guildMemberAdd', (m) => checarNome(m)));
    client.on('guildMemberUpdate', seguro('guildMemberUpdate', async (antes, depois) => {
      if (antes.nickname !== depois.nickname) await checarNome(depois);
    }));

    console.log('[Automod] ligado');
  },
};
