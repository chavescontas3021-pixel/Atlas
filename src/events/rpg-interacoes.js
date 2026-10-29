const { MessageFlags } = require('discord.js');
const { ITENS, LOJA } = require('../rpg/dados');
const N = require('../rpg/nucleo');
const C = require('../rpg/combate');
const Duelo = require('../rpg/duelo');

const EPH = MessageFlags.Ephemeral;

async function autocompletar(interaction) {
  const foco = interaction.options.getFocused().toLowerCase();
  let ids = [];

  if (interaction.commandName === 'rpgadmin') {
    ids = Object.keys(ITENS);
  } else {
    const sub = interaction.options.getSubcommand();
    const j = N.obter(interaction.user.id);
    const inv = j ? Object.keys(j.inv) : [];
    if (sub === 'comprar') ids = LOJA;
    else if (sub === 'vender') ids = inv;
    else if (sub === 'usar') ids = inv.filter((k) => ITENS[k] && ITENS[k].tipo === 'consumo');
    else if (sub === 'equipar') ids = inv.filter((k) => ITENS[k] && ['arma', 'armadura'].includes(ITENS[k].tipo));
  }

  const res = ids
    .filter((k) => ITENS[k] && ITENS[k].nome.toLowerCase().includes(foco))
    .slice(0, 25)
    .map((k) => ({ name: `${ITENS[k].emoji} ${ITENS[k].nome}`.slice(0, 100), value: k }));
  await interaction.respond(res).catch(() => {});
}

async function combate(interaction, partes) {
  const acao = partes[2];
  const userId = partes[3];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse combate não é seu.', flags: EPH });
  }
  const e = C.obterAtivo(userId);
  if (!e) {
    return interaction.update({ content: '⌛ Esse combate expirou.', components: [] });
  }
  const j = N.obter(userId);
  if (!j) return interaction.update({ content: 'Personagem não encontrado.', components: [] });

  const r = C.agir(e, j, acao);
  if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });

  await interaction.deferUpdate(); // desenhar o GIF leva um instante
  if (r.fim) {
    const files = C.arquivos(e, j, r.fim);
    const res = C.finalizar(e, j, r.fim);
    return interaction.editReply({ embeds: [C.embedFim(e, j, r.fim, res)], components: [], files, attachments: [] });
  }
  N.salvar(userId, j);
  return interaction.editReply({ embeds: [C.embedCombate(e, j)], components: C.botoes(userId), files: C.arquivos(e, j), attachments: [] });
}

async function duelo(interaction, partes) {
  const [, , acao, desafianteId, alvoId, apostaTxt] = partes;
  const aposta = parseInt(apostaTxt, 10) || 0;
  if (interaction.user.id !== alvoId) {
    return interaction.reply({ content: 'Só o desafiado pode responder.', flags: EPH });
  }
  if (acao === 'no') {
    return interaction.update({ content: `❌ <@${alvoId}> recusou o duelo.`, components: [] });
  }

  const a = N.obter(desafianteId);
  const b = N.obter(alvoId);
  if (!a || !b) return interaction.update({ content: 'Um dos personagens não existe mais.', components: [] });
  if (a.moedas < aposta || b.moedas < aposta) {
    return interaction.update({ content: 'Alguém não tem mais stars para a aposta. Duelo cancelado.', components: [] });
  }

  if (Duelo.emDuelo(desafianteId) || Duelo.emDuelo(alvoId)) {
    return interaction.reply({ content: 'Um dos dois já está em um duelo.', flags: EPH });
  }

  await interaction.deferUpdate(); // desenhar o GIF leva um instante
  const d = Duelo.iniciar(desafianteId, a, alvoId, b, aposta, async (duel) => {
    // Tempo esgotado: quem estava na vez perde (W.O.)
    const quem = Duelo.vez(duel);
    duel.log = [`⌛ <@${quem.id}> demorou demais e perdeu por W.O.!`];
    const venc = quem.id === duel.a.id ? duel.b : duel.a;
    const r = Duelo.finalizar(duel, venc);
    duel.eventos = [];
    if (duel.msg) await duel.msg.edit({ content: '', embeds: [Duelo.embedFim(duel, r)], components: [], files: Duelo.arquivos(duel, r.perdedor.id), attachments: [] }).catch(() => {});
  });
  await interaction.editReply({
    content: `⚔️ <@${Duelo.vez(d).id}>, é a sua vez!`,
    embeds: [Duelo.embedDuelo(d)],
    components: Duelo.botoes(d),
    files: Duelo.arquivos(d),
    attachments: [],
  });
  d.msg = interaction.message;
}

// Botões do duelo em andamento (rpg:u:acao:id)
async function duelando(interaction, partes) {
  const acao = partes[2];
  const d = Duelo.obter(partes[3]);
  if (!d) return interaction.update({ content: '⌛ Esse duelo já terminou.', components: [] });

  if (!Duelo.lado(d, interaction.user.id)) {
    return interaction.reply({ content: 'Esse duelo não é seu.', flags: EPH });
  }
  if (Duelo.vez(d).id !== interaction.user.id) {
    return interaction.reply({ content: 'Calma, ainda não é a sua vez! ⏳', flags: EPH });
  }

  const r = Duelo.agir(d, acao);
  if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });

  await interaction.deferUpdate(); // desenhar o GIF leva um instante
  if (r.fim) {
    const fim = Duelo.finalizar(d, r.vencedor);
    return interaction.editReply({ content: '', embeds: [Duelo.embedFim(d, fim)], components: [], files: Duelo.arquivos(d, fim.perdedor.id), attachments: [] });
  }
  d.msg = interaction.message;
  return interaction.editReply({
    content: `⚔️ <@${Duelo.vez(d).id}>, é a sua vez!`,
    embeds: [Duelo.embedDuelo(d)],
    components: Duelo.botoes(d),
    files: Duelo.arquivos(d),
    attachments: [],
  });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && ['rpg', 'rpgadmin'].includes(interaction.commandName)) {
        return await autocompletar(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith('rpg:')) {
        const partes = interaction.customId.split(':');
        if (partes[1] === 'c') return await combate(interaction, partes);
        if (partes[1] === 'd') return await duelo(interaction, partes);
        if (partes[1] === 'u') return await duelando(interaction, partes);
      }
    } catch (err) {
      console.error('[RPG]', err);
      try {
        if (interaction.isRepliable && interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Deu erro no RPG. Tente de novo.', flags: EPH });
        }
      } catch (_) { /* ignora */ }
    }
  },
};
// fim do arquivo
