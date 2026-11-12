const { MessageFlags } = require('discord.js');
const { ITENS, LOJA } = require('../rpg/dados');
const N = require('../rpg/nucleo');
const C = require('../rpg/combate');
const Duelo = require('../rpg/duelo');
const Venda = require('../rpg/venda');

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

// Mostra o turno do duelo. Se responder ao Discord falhar (rede, tempo), tenta editar a mensagem
// do duelo e, por último, manda uma mensagem nova no canal. Assim o duelo nunca fica sem tela.
async function mostrarTurno(d, interaction) {
  const carga = {
    content: `⚔️ <@${Duelo.vez(d).id}>, é a sua vez!`,
    embeds: [Duelo.embedDuelo(d)],
    components: Duelo.botoes(d),
    files: Duelo.arquivos(d),
    attachments: [],
  };
  try {
    await interaction.editReply(carga);
    d.msg = interaction.message;
    return;
  } catch (e) {
    console.error('[Duelo] resposta do turno falhou:', e.message);
  }
  try {
    await interaction.message.edit(carga);
    d.msg = interaction.message;
    return;
  } catch (e) {
    console.error('[Duelo] editar a mensagem do turno falhou:', e.message);
  }
  const { attachments, ...nova } = carga;
  const enviada = interaction.channel ? await interaction.channel.send(nova).catch(() => null) : null;
  if (enviada) d.msg = enviada;
}

// Fim do duelo: tira da memória e paga o prêmio PRIMEIRO (o duelo nunca fica preso),
// depois mostra o resultado e MARCA o vencedor numa mensagem nova (para ele ser avisado).
async function encerrarDuelo(d, vencedor, interaction) {
  if (!Duelo.obter(d.id)) return; // já foi encerrado (ex.: tempo esgotado ao mesmo tempo)
  const fim = Duelo.finalizar(d, vencedor);
  const carga = {
    content: '',
    embeds: [Duelo.embedFim(d, fim)],
    components: [],
    files: Duelo.arquivos(d, fim.perdedor.id),
    attachments: [],
  };
  const msg = (interaction && interaction.message) || d.msg;
  let mostrou = false;
  if (interaction) {
    try {
      await interaction.editReply(carga);
      mostrou = true;
    } catch (e) {
      console.error('[Duelo] resposta final falhou:', e.message);
    }
  }
  if (!mostrou && msg) {
    try {
      await msg.edit(carga);
      mostrou = true;
    } catch (e) {
      console.error('[Duelo] editar a mensagem final falhou:', e.message);
    }
  }
  const canal = (msg && msg.channel) || (interaction && interaction.channel);
  if (canal) {
    const aviso =
      `🏆 <@${fim.vencedor.id}> venceu o duelo contra <@${fim.perdedor.id}>!` +
      `${fim.valor ? ` (+${fim.valor} stars)` : ''}`;
    await canal.send({ content: aviso, allowedMentions: { users: [fim.vencedor.id] } }).catch((e) => console.error('[Duelo] aviso do vencedor falhou:', e.message));
    if (!mostrou) {
      const { attachments, ...sozinha } = carga;
      await canal.send(sozinha).catch(() => {});
    }
  }
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
    duel.eventos = [];
    await encerrarDuelo(duel, venc, null);
  });
  await mostrarTurno(d, interaction);
}

// Botões do /rpg vendertudo (rpg:vt:modo:userId)
async function vendaEmMassa(interaction, partes) {
  const modo = partes[2];
  const userId = partes[3];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse menu não é seu.', flags: EPH });
  }
  if (modo === 'no') {
    return interaction.update({ content: '👍 Venda cancelada.', embeds: [], components: [] });
  }
  if (!['tudo', 'mat'].includes(modo)) return undefined;
  const j = N.obter(userId);
  if (!j) return interaction.update({ content: 'Personagem não encontrado.', embeds: [], components: [] });
  const r = Venda.vender(j, modo);
  if (!r.itens.length) {
    return interaction.update({ content: 'Você não tem mais nada para vender.', embeds: [], components: [] });
  }
  N.salvar(userId, j);
  const qtd = r.itens.reduce((s, x) => s + x.q, 0);
  return interaction.update({
    content: `⭐ Você vendeu **${qtd}** item(ns) por **${r.total}** stars! Agora você tem ⭐ ${j.moedas}.`,
    embeds: [],
    components: [],
  });
}

// Botões do duelo em andamento (rpg:u:acao:id)
async function duelando(interaction, partes) {
  const acao = partes[2];
  const d = Duelo.obter(partes[3]);
  if (!d) return interaction.update({ content: '⌛ Esse duelo já terminou.', components: [] });

  if (!Duelo.lado(d, interaction.user.id)) {
    return interaction.reply({ content: 'Esse duelo não é seu.', flags: EPH });
  }

  // Autoreparo: um duelo aberto em que alguém já está sem vida ficou preso, então encerra agora
  if (d.a.hp <= 0 || d.b.hp <= 0) {
    await interaction.deferUpdate().catch(() => {});
    return encerrarDuelo(d, d.a.hp <= 0 ? d.b : d.a, interaction);
  }

  if (Duelo.vez(d).id !== interaction.user.id) {
    return interaction.reply({ content: 'Calma, ainda não é a sua vez! ⏳', flags: EPH });
  }
  const atual = Duelo.vez(d);
  if (acao === 'hab' && atual.cd > 0) {
    return interaction.reply({ content: `Sua habilidade está em recarga (${atual.cd} turno(s)).`, flags: EPH });
  }

  // Confirma o clique ao Discord ANTES de mexer no duelo: se isso falhar, nada muda e dá para clicar de novo
  try {
    await interaction.deferUpdate(); // desenhar o GIF leva um instante
  } catch (e) {
    console.error('[Duelo] não consegui confirmar o clique:', e.message);
    return undefined;
  }

  const r = Duelo.agir(d, acao);
  if (r.invalido) return interaction.followUp({ content: r.invalido, flags: EPH });
  if (r.fim) return encerrarDuelo(d, r.vencedor, interaction);
  return mostrarTurno(d, interaction);
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
        if (partes[1] === 'vt') return await vendaEmMassa(interaction, partes);
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
