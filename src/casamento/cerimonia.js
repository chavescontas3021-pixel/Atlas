// A cerimônia: o Atlas faz de padre, faz as perguntas e os noivos respondem pelos botões.
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const N = require('./nucleo');

const EPH = MessageFlags.Ephemeral;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const pausa = () => dormir(N.ajustes.pausa);
const avancando = new Set(); // canais que estão trocando de passo agora
const TEMPO_OBJECAO = () => (N.ajustes.pausa === 0 ? 20 : 20000);

// Os passos depois da abertura. "ambos" = os dois noivos precisam clicar.
const PASSOS = [
  {
    id: 'vontade', tipo: 'ambos', titulo: '💍 Primeira pergunta',
    texto: '{a} e {b}, vocês estão aqui por livre e espontânea vontade, de coração aberto, para se unirem diante de todos os convidados?',
    sim: 'Sim, estou aqui!',
  },
  { id: 'votos', tipo: 'votos' },
  {
    id: 'alianca', tipo: 'ambos', titulo: '💞 Segunda pergunta',
    texto: '{a}, você aceita {b} como seu amor, para estar ao lado dessa pessoa na alegria e na tristeza, nos dias fáceis e nos difíceis, cuidando e sendo cuidado(a)?\nE você, {b}, aceita {a} do mesmo jeito?',
    sim: 'Aceito!',
  },
  { id: 'objecao', tipo: 'objecao' },
  { id: 'fim', tipo: 'fim' },
];

const embed = (titulo, texto, extra) => {
  const e = new EmbedBuilder().setColor(N.COR).setTitle(titulo).setDescription(texto);
  if (extra) e.setFooter({ text: extra });
  return e;
};

const vars = (c) => ({ a: N.mencao(c.a), b: N.mencao(c.b) });

async function canalDe(client, c) {
  return client.channels.cache.get(c.canalId) || (await client.channels.fetch(c.canalId).catch(() => null));
}

// ---------- Começar ----------
async function iniciar(client, c) {
  const canal = await canalDe(client, c);
  if (!canal) return { erro: 'Não encontrei o canal do casamento.' };
  if (c.status === 'andamento') return { erro: 'A cerimônia já está acontecendo.' };
  if (c.status === 'concluido') return { erro: 'Este casamento já foi realizado.' };
  if (N.casalDe(c.a) || N.casalDe(c.b)) return { erro: 'Um dos noivos já está casado(a).' };

  c.status = 'andamento';
  c.passo = -1;
  c.resp = {};
  c.votos = {};
  N.salvarCerimonia(c);
  await N.travarConvidados(canal, c, true); // convidados só assistem até o fim

  const v = vars(c);
  const ping = { users: [c.a, c.b] };
  await canal.send({
    content: `${v.a} ${v.b}`,
    allowedMentions: ping,
    embeds: [embed('💒 A cerimônia vai começar!', 'Convidados, por favor, fiquem à vontade e façam silêncio. 🤫\nO Atlas vai conduzir a cerimônia.')],
  });
  await pausa();
  await canal.send({
    embeds: [embed('📜 Estamos reunidos aqui...', `Estamos reunidos hoje para celebrar a união de ${v.a} e ${v.b}.\nO amor une pessoas de um jeito que nenhuma regra explica, e hoje vamos ver esse laço ficar ainda mais forte. 💕`)],
    allowedMentions: ping,
  });
  await pausa();
  return proximo(client, c.canalId);
}

// ---------- Passo a passo ----------
async function proximo(client, canalId) {
  if (avancando.has(canalId)) return {};
  avancando.add(canalId);
  try {
    const c = N.cerimoniaDoCanal(canalId);
    if (!c || c.status !== 'andamento') return {};
    const canal = await canalDe(client, c);
    if (!canal) return {};
    c.passo++;
    c.resp = {};
    const passo = PASSOS[c.passo];
    N.salvarCerimonia(c);
    if (!passo) return {};
    const v = vars(c);
    const ping = { users: [c.a, c.b] };

    if (passo.tipo === 'ambos') {
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cas:sim:${canalId}:${passo.id}`).setLabel(passo.sim).setEmoji('💖').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cas:nao:${canalId}:${passo.id}`).setLabel('Não').setStyle(ButtonStyle.Secondary)
      );
      const msg = await canal.send({
        content: `${v.a} ${v.b}`,
        allowedMentions: ping,
        embeds: [embed(passo.titulo, N.preencher(passo.texto, v), 'Os dois precisam responder pelos botões')],
        components: [botoes],
      });
      c.msgId = msg.id;
    } else if (passo.tipo === 'votos') {
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cas:voto:${canalId}`).setLabel('Escrever meus votos').setEmoji('✍️').setStyle(ButtonStyle.Primary)
      );
      const msg = await canal.send({
        content: `${v.a} ${v.b}`,
        allowedMentions: ping,
        embeds: [embed('💌 Hora dos votos', 'Agora, cada um de vocês vai dizer, com as próprias palavras, o que sente e o que promete.\nClique no botão e escreva com carinho. Os dois precisam escrever.')],
        components: [botoes],
      });
      c.msgId = msg.id;
    } else if (passo.tipo === 'objecao') {
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`cas:obj:${canalId}`).setLabel('Eu me oponho!').setEmoji('🙋').setStyle(ButtonStyle.Danger)
      );
      const msg = await canal.send({
        embeds: [embed('🔔 Se alguém tiver algo a dizer...', 'Se alguém aqui tem um motivo para que estes dois não se casem, fale agora ou cale-se para sempre!\n(Vocês têm 20 segundos... 👀)')],
        components: [botoes],
      });
      c.msgId = msg.id;
      N.salvarCerimonia(c);
      const alvoPasso = c.passo;
      setTimeout(async () => {
        const atual = N.cerimoniaDoCanal(canalId);
        if (!atual || atual.status !== 'andamento' || atual.passo !== alvoPasso) return;
        await msg.edit({ components: [] }).catch(() => {});
        await canal.send('🤫 Silêncio total. Ninguém se opôs!').catch(() => {});
        await pausa();
        avancando.delete(canalId);
        proximo(client, canalId).catch((e) => console.error('[Casamento]', e));
      }, TEMPO_OBJECAO());
      return {};
    } else if (passo.tipo === 'fim') {
      await finalizar(client, c, canal);
      return {};
    }
    N.salvarCerimonia(c);
    return {};
  } finally {
    avancando.delete(canalId);
  }
}

async function finalizar(client, c, canal) {
  const v = vars(c);
  c.status = 'concluido';
  c.msgId = null;
  N.salvarCerimonia(c);
  const casal = N.registrarCasal(c.a, c.b, c.canalId);
  await N.travarConvidados(canal, c, false);

  await canal.send({
    embeds: [embed('✨ Pelos poderes que me foram dados...', `Diante de todos os convidados, eu, Atlas, declaro ${v.a} e ${v.b} oficialmente **casados**! 💍`)],
    allowedMentions: { users: [c.a, c.b] },
  });
  await pausa();
  await canal.send({
    content: `${v.a} ${v.b}`,
    allowedMentions: { users: [c.a, c.b] },
    embeds: [embed('💋 Podem se beijar!', `Parabéns, ${v.a} e ${v.b}! 🎉🥂\nQue a vida de vocês seja cheia de carinho, risadas e muita cumplicidade.\n\n🎊 Convidados, a festa está liberada!`, `Casados desde ${new Date(casal.desde).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)],
  });

  // Aviso público (se a staff configurou um canal de anúncios)
  const anuncioId = N.cfg('anuncio');
  const anuncio = anuncioId && anuncioId !== canal.id && canal.guild && canal.guild.channels.cache.get(anuncioId);
  if (anuncio) {
    await anuncio
      .send({ embeds: [embed('💍 Temos um novo casal!', `${v.a} e ${v.b} acabaram de se casar. Parabéns aos dois! 🥂`)], allowedMentions: { users: [c.a, c.b] } })
      .catch(() => {});
  }

  // Cargo de casado (se a staff configurou)
  const cargoId = N.cfg('cargo');
  if (cargoId && canal.guild) {
    for (const uid of [c.a, c.b]) {
      const m = await canal.guild.members.fetch(uid).catch(() => null);
      if (m) await m.roles.add(cargoId).catch(() => {});
    }
  }
}

// ---------- Interações ----------
function ehNoivoDaCerimonia(c, uid) {
  return N.ehNoivo(c, uid);
}

async function botaoSim(client, interaction, canalId, passoId) {
  const c = N.cerimoniaDoCanal(canalId);
  if (!c || c.status !== 'andamento' || !PASSOS[c.passo] || PASSOS[c.passo].id !== passoId) {
    return interaction.reply({ content: 'Essa pergunta já passou.', flags: EPH });
  }
  if (!ehNoivoDaCerimonia(c, interaction.user.id)) {
    return interaction.reply({ content: 'Só os noivos respondem a essa pergunta. 💕', flags: EPH });
  }
  c.resp[interaction.user.id] = true;
  N.salvarCerimonia(c);
  const faltam = [c.a, c.b].filter((u) => !c.resp[u]);
  if (faltam.length) {
    await interaction.reply({ content: `💖 Resposta registrada! Falta ${N.mencao(faltam[0])} responder.`, allowedMentions: { parse: [] } });
    return;
  }
  await interaction.update({ components: [] });
  await interaction.channel.send('💖 Os dois disseram **sim**!').catch(() => {});
  await pausa();
  return proximo(client, canalId);
}

async function botaoNao(client, interaction, canalId, passoId) {
  const c = N.cerimoniaDoCanal(canalId);
  if (!c || c.status !== 'andamento' || !PASSOS[c.passo] || PASSOS[c.passo].id !== passoId) {
    return interaction.reply({ content: 'Essa pergunta já passou.', flags: EPH });
  }
  if (!ehNoivoDaCerimonia(c, interaction.user.id)) {
    return interaction.reply({ content: 'Só os noivos respondem a essa pergunta. 💕', flags: EPH });
  }
  c.status = 'interrompido';
  N.salvarCerimonia(c);
  await N.travarConvidados(interaction.channel, c, false);
  await interaction.update({ components: [] });
  return interaction.channel.send({
    embeds: [embed('⏸️ Cerimônia pausada', `${N.mencao(interaction.user.id)} pediu um tempo. Sem pressa: respirem, conversem e, quando estiverem prontos, a staff pode recomeçar com \`/casamento iniciar\` (a cerimônia volta do começo).`)],
    allowedMentions: { parse: [] },
  });
}

async function botaoVoto(interaction, canalId) {
  const c = N.cerimoniaDoCanal(canalId);
  if (!c || c.status !== 'andamento' || !PASSOS[c.passo] || PASSOS[c.passo].id !== 'votos') {
    return interaction.reply({ content: 'A hora dos votos já passou.', flags: EPH });
  }
  if (!ehNoivoDaCerimonia(c, interaction.user.id)) {
    return interaction.reply({ content: 'Só os noivos escrevem votos. 💕', flags: EPH });
  }
  if (c.votos[interaction.user.id]) return interaction.reply({ content: 'Você já leu os seus votos! 💌', flags: EPH });
  const modal = new ModalBuilder()
    .setCustomId(`cas:votomodal:${canalId}`)
    .setTitle('Seus votos')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('voto')
          .setLabel('O que você sente e promete?')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(600)
          .setRequired(true)
      )
    );
  return interaction.showModal(modal);
}

async function enviarVoto(client, interaction, canalId) {
  const c = N.cerimoniaDoCanal(canalId);
  if (!c || c.status !== 'andamento' || !PASSOS[c.passo] || PASSOS[c.passo].id !== 'votos' || !ehNoivoDaCerimonia(c, interaction.user.id)) {
    return interaction.reply({ content: 'A hora dos votos já passou.', flags: EPH });
  }
  if (c.votos[interaction.user.id]) return interaction.reply({ content: 'Você já leu os seus votos! 💌', flags: EPH });
  const texto = interaction.fields.getTextInputValue('voto').trim();
  c.votos[interaction.user.id] = true;
  N.salvarCerimonia(c);
  await interaction.reply({
    embeds: [embed(`💌 Votos de ${interaction.member ? interaction.member.displayName : interaction.user.username}`, texto.slice(0, 4000))],
  });
  if (c.votos[c.a] && c.votos[c.b]) {
    if (c.msgId) {
      const m = await interaction.channel.messages.fetch(c.msgId).catch(() => null);
      if (m) await m.edit({ components: [] }).catch(() => {});
    }
    await pausa();
    return proximo(client, canalId);
  }
}

async function botaoObjecao(interaction, canalId) {
  const c = N.cerimoniaDoCanal(canalId);
  if (!c || c.status !== 'andamento' || !PASSOS[c.passo] || PASSOS[c.passo].id !== 'objecao') {
    return interaction.reply({ content: 'Tarde demais! 😅', flags: EPH });
  }
  return interaction.reply({
    content: `🙋 ${N.mencao(interaction.user.id)} levantou a mão... mas o amor deles é mais forte! A cerimônia continua. 😄`,
    allowedMentions: { parse: [] },
  });
}

module.exports = { iniciar, proximo, botaoSim, botaoNao, botaoVoto, enviarVoto, botaoObjecao, PASSOS };
