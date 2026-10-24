const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('./nucleo');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const chave = (id) => `livraria.sessoes.${id}`;
const rascunho = (id) => `livraria.rascunhos.${id}`;
const MAX_CAPA = 8 * 1024 * 1024;

const btn = (id, label, emoji, estilo) =>
  new ButtonBuilder().setCustomId(id).setLabel(label).setEmoji(emoji).setStyle(estilo);

function entrada(id, label, estilo, max, valor, min) {
  const t = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(estilo).setMaxLength(max).setRequired(true);
  if (min) t.setMinLength(min);
  if (valor) t.setValue(String(valor).slice(0, max));
  return new ActionRowBuilder().addComponents(t);
}

// ---------- Canal privado e limpeza ----------

async function criarCanal(member) {
  const guild = member.guild;
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const P = PermissionFlagsBits;
  const basico = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];

  const permissoes = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: member.id, allow: basico },
    { id: eu.id, allow: [...basico, P.ManageChannels] },
  ];
  const staff = N.cfg('staff');
  if (staff && guild.roles.cache.has(staff)) permissoes.push({ id: staff, allow: basico });

  const nome = ('livro-' + member.user.username).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 90);
  const opcoes = {
    name: nome,
    type: ChannelType.GuildText,
    topic: `Publicação de livro de ${member.user.username}`,
    permissionOverwrites: permissoes,
  };
  const categoria = N.cfg('categoria');
  if (categoria && guild.channels.cache.has(categoria)) opcoes.parent = categoria;
  return guild.channels.create(opcoes);
}

// Se o membro abandonar a publicação, o canal é apagado depois de 3 horas
function agendarLimpeza(canal, userId) {
  setTimeout(async () => {
    const s = db.get(chave(userId));
    if (s && s.canalId === canal.id) {
      db.remover(chave(userId));
      await canal.delete('Publicação abandonada').catch(() => {});
    }
  }, 3 * 60 * 60 * 1000);
}

// ---------- Passo 1: título e sinopse ----------

async function iniciarPublicacao(interaction) {
  if (!N.cfg('canalLivros')) {
    return interaction.reply({ content: '⚠️ A livraria ainda não foi configurada. Avise a staff.', flags: EPH });
  }
  const member = interaction.member;
  const existente = db.get(chave(member.id));
  if (existente) {
    const c = await interaction.guild.channels.fetch(existente.canalId).catch(() => null);
    if (c) return interaction.reply({ content: `Você já tem uma publicação em andamento: ${c}`, flags: EPH });
    db.remover(chave(member.id));
  }

  await interaction.deferReply({ flags: EPH });
  const canal = await criarCanal(member);
  db.set(chave(member.id), { canalId: canal.id, etapa: 'texto' });
  agendarLimpeza(canal, member.id);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📖 Passo 1 de 3 — Título e sinopse')
    .setDescription(
      'Clique no botão abaixo e preencha:\n' +
        '• o **título** do livro\n• o seu nome de **autor(a)** na house\n' +
        `• a **sinopse** (mínimo de **${N.minLinhas()} linhas**)\n\n` +
        'Se a sinopse ficar curta, eu guardo o que você escreveu para você completar.'
    );
  await canal.send({
    content: `<@${member.id}>`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn(`livraria:texto:${member.id}`, 'Preencher', '✍️', ButtonStyle.Primary))],
  });
  return interaction.editReply(`📖 Abri um canal privado para você: ${canal}`);
}

async function abrirModalTexto(interaction, userId) {
  const s = db.get(chave(userId));
  if (!s) return interaction.reply({ content: 'Não achei a sua publicação. Comece de novo pelo painel.', flags: EPH });
  const modal = new ModalBuilder()
    .setCustomId(`livraria:modaltexto:${userId}`)
    .setTitle('Título e sinopse')
    .addComponents(
      entrada('titulo', 'Título do livro', TextInputStyle.Short, 100, s.titulo),
      entrada('autor', 'Seu nome de autor(a) na house', TextInputStyle.Short, 80, s.autor || interaction.member.displayName),
      entrada('sinopse', `Sinopse (mínimo de ${N.minLinhas()} linhas)`, TextInputStyle.Paragraph, 4000, s.sinopse)
    );
  return interaction.showModal(modal);
}

async function receberTexto(interaction, userId) {
  const sessao = db.get(chave(userId));
  if (!sessao) return interaction.reply({ content: 'Não achei a sua publicação. Comece de novo pelo painel.', flags: EPH });

  const titulo = interaction.fields.getTextInputValue('titulo').trim();
  const autor = interaction.fields.getTextInputValue('autor').trim();
  const sinopse = interaction.fields.getTextInputValue('sinopse').trim();
  const linhas = N.contarLinhas(sinopse);
  const min = N.minLinhas();

  const salvo = { ...sessao, titulo, autor, sinopse };
  db.set(chave(userId), salvo); // guarda sempre, para o membro poder corrigir

  if (linhas < min) {
    return interaction.reply({
      content: `❌ Sua sinopse tem **${linhas}** linha(s) e o mínimo é **${min}**. Clique em **Corrigir** para continuar de onde parou.`,
      components: [new ActionRowBuilder().addComponents(btn(`livraria:texto:${userId}`, 'Corrigir', '✏️', ButtonStyle.Primary))],
      flags: EPH,
    });
  }

  if (sessao.etapa === 'texto') {
    db.set(chave(userId), { ...salvo, etapa: 'capa' });
    return interaction.reply({
      content:
        `✅ Título e sinopse salvos! (${linhas} linhas)\n\n` +
        '🖼️ **Passo 2 de 3 — Capa:** envie aqui no chat a **imagem da capa** do livro (PNG, JPG ou WEBP, até 8 MB).',
    });
  }
  if (sessao.etapa === 'preview') {
    await interaction.reply({ content: '✅ Texto atualizado!' });
    return enviarPreview(interaction.channel, interaction.member);
  }
  return interaction.reply({ content: '✅ Texto atualizado!', flags: EPH });
}

// ---------- Passo 2 e 3: capa, PDF e classificação ----------

function menuClasse(userId, atual) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`livraria:classe:${userId}`)
      .setPlaceholder('Classificação indicativa')
      .addOptions([
        { label: 'Livre', value: 'livre', emoji: '🟢', description: 'Para todas as idades', default: atual === 'livre' },
        { label: '+15', value: '+15', emoji: '🟠', description: 'Para maiores de 15 anos', default: atual === '+15' },
        { label: '+18', value: '+18', emoji: '🔴', description: 'Conteúdo adulto', default: atual === '+18' },
      ])
  );
}

async function receberMensagem(message, sessao) {
  const anexo = message.attachments.first();
  if (!anexo) return;
  if (sessao.etapa === 'capa') return receberCapa(message, anexo, sessao);
  if (sessao.etapa === 'arquivos') return receberPdf(message, anexo, sessao);
}

async function receberCapa(message, anexo, s) {
  if (!N.ehImagem(anexo)) {
    return message.reply('Essa capa precisa ser uma **imagem** (PNG, JPG ou WEBP).');
  }
  if (anexo.size > MAX_CAPA) {
    return message.reply('A capa é muito grande. Envie uma imagem de até **8 MB**.');
  }
  await message.react('✅').catch(() => {});
  const novo = { ...s, capaMsgId: message.id };

  if (s.pdfMsgId && s.classe) {
    db.set(chave(message.author.id), novo);
    return enviarPreview(message.channel, message.member);
  }

  db.set(chave(message.author.id), { ...novo, etapa: 'arquivos' });
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📄 Passo 3 de 3 — PDF e classificação')
    .setDescription('1️⃣ Escolha a **classificação** no menu abaixo.\n2️⃣ Envie aqui no chat o **arquivo PDF** do livro.');
  return message.channel.send({ embeds: [embed], components: [menuClasse(message.author.id, s.classe)] });
}

async function receberPdf(message, anexo, s) {
  if (!N.ehPdf(anexo)) {
    return message.reply('O livro precisa ser enviado em **PDF**.');
  }
  await message.react('✅').catch(() => {});
  const novo = { ...s, pdfMsgId: message.id };
  db.set(chave(message.author.id), novo);

  if (s.classe) return enviarPreview(message.channel, message.member);
  return message.channel.send('✅ PDF recebido! Só falta escolher a **classificação** no menu acima.');
}

async function escolherClasse(interaction, userId) {
  const s = db.get(chave(userId));
  if (!s) return interaction.reply({ content: 'Não achei a sua publicação.', flags: EPH });

  const classe = interaction.values[0];
  const info = N.CLASSES[classe];
  if (!info) return;
  db.set(chave(userId), { ...s, classe });

  await interaction.update({ content: `✅ Classificação escolhida: ${info.emoji} **${info.nome}**`, embeds: [], components: [] });

  if (s.capaMsgId && s.pdfMsgId) return enviarPreview(interaction.channel, interaction.member);
  return interaction.channel.send('Agora envie aqui no chat o **arquivo PDF** do livro.');
}

// ---------- Prévia ----------

async function enviarPreview(canal, member) {
  const s = db.get(chave(member.id));
  if (!s) return;

  const capaMsg = await canal.messages.fetch(s.capaMsgId).catch(() => null);
  const pdfMsg = await canal.messages.fetch(s.pdfMsgId).catch(() => null);
  const capa = capaMsg && capaMsg.attachments.first();
  const pdf = pdfMsg && pdfMsg.attachments.first();

  if (!capa) {
    db.set(chave(member.id), { ...s, etapa: 'capa', capaMsgId: null });
    return canal.send('⚠️ Não encontrei a capa. Envie a imagem da capa de novo.');
  }
  if (!pdf) {
    db.set(chave(member.id), { ...s, etapa: 'arquivos', pdfMsgId: null });
    return canal.send('⚠️ Não encontrei o PDF. Envie o arquivo PDF de novo.');
  }

  if (s.previewMsgId) await canal.messages.delete(s.previewMsgId).catch(() => {});

  const embeds = N.embedsDoLivro({
    titulo: s.titulo,
    autor: s.autor,
    autorId: member.id,
    sinopse: s.sinopse,
    classe: s.classe,
    capaUrl: capa.url,
    publicador: member.displayName,
  });
  const botoes = new ActionRowBuilder().addComponents(
    btn(`livraria:publicar:${member.id}`, 'Publicar', '✅', ButtonStyle.Success),
    btn(`livraria:editar:${member.id}`, 'Editar texto', '✏️', ButtonStyle.Secondary),
    btn(`livraria:trocarcapa:${member.id}`, 'Trocar capa', '🖼️', ButtonStyle.Secondary),
    btn(`livraria:trocarpdf:${member.id}`, 'Trocar PDF', '📄', ButtonStyle.Secondary),
    btn(`livraria:cancelar:${member.id}`, 'Cancelar', '🗑️', ButtonStyle.Danger)
  );

  const enviada = await canal.send({
    content:
      `👀 **Prévia** — é assim que o seu livro vai aparecer.\n` +
      `📎 **PDF:** ${pdf.name} (${(pdf.size / 1048576).toFixed(1)} MB)`,
    embeds,
    components: [botoes, menuClasse(member.id, s.classe)],
  });
  db.set(chave(member.id), { ...s, etapa: 'preview', previewMsgId: enviada.id });
}

async function trocarCapa(interaction, userId) {
  const s = db.get(chave(userId));
  if (!s) return interaction.reply({ content: 'Não achei a sua publicação.', flags: EPH });
  db.set(chave(userId), { ...s, etapa: 'capa', capaMsgId: null });
  return interaction.reply('🖼️ Envie a **nova capa** aqui no chat.');
}

async function trocarPdf(interaction, userId) {
  const s = db.get(chave(userId));
  if (!s) return interaction.reply({ content: 'Não achei a sua publicação.', flags: EPH });
  db.set(chave(userId), { ...s, etapa: 'arquivos', pdfMsgId: null });
  return interaction.reply('📄 Envie o **novo PDF** aqui no chat.');
}

async function cancelar(interaction, userId) {
  db.remover(chave(userId));
  await interaction.reply('🗑️ Publicação cancelada. Este canal será apagado em instantes.');
  const canal = interaction.channel;
  setTimeout(() => canal.delete('Publicação cancelada').catch(() => {}), 4000);
}

// ---------- Publicar ----------

async function publicar(interaction, userId) {
  const s = db.get(chave(userId));
  if (!s || s.etapa !== 'preview' || !s.capaMsgId || !s.pdfMsgId || !s.classe) {
    return interaction.reply({ content: 'Termine todos os passos antes de publicar.', flags: EPH });
  }
  await interaction.deferReply({ flags: EPH });

  const guild = interaction.guild;
  const canal = interaction.channel;
  const member = interaction.member;
  const canalLivros = guild.channels.cache.get(N.cfg('canalLivros'));
  if (!canalLivros) return interaction.editReply('⚠️ O canal de livros não está configurado. Avise a staff.');

  const capaMsg = await canal.messages.fetch(s.capaMsgId).catch(() => null);
  const pdfMsg = await canal.messages.fetch(s.pdfMsgId).catch(() => null);
  const capaAnexo = capaMsg && capaMsg.attachments.first();
  const pdfAnexo = pdfMsg && pdfMsg.attachments.first();
  if (!capaAnexo || !pdfAnexo) return interaction.editReply('⚠️ Não achei a capa ou o PDF. Use **Trocar capa** ou **Trocar PDF**.');

  let capaBuf;
  let pdfBuf;
  try {
    capaBuf = await N.baixar(capaAnexo.url);
    pdfBuf = await N.baixar(pdfAnexo.url);
  } catch (erro) {
    console.error('[Livraria] erro ao baixar arquivos:', erro);
    return interaction.editReply('⚠️ Não consegui baixar a capa ou o PDF. Tente **Trocar capa** ou **Trocar PDF**.');
  }

  const id = N.proximoId();
  const capaNome = `capa.${N.extensaoImagem(capaAnexo)}`;
  const pdfNome = `${N.slug(s.titulo)}.pdf`;
  const embeds = N.embedsDoLivro({
    titulo: s.titulo,
    autor: s.autor,
    autorId: member.id,
    sinopse: s.sinopse,
    classe: s.classe,
    capaUrl: `attachment://${capaNome}`,
    publicador: member.displayName,
  });

  const botoes = new ActionRowBuilder();
  const canalFeedback = N.cfg('canalFeedback');
  if (canalFeedback) {
    botoes.addComponents(
      new ButtonBuilder()
        .setLabel('Dar feedback')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${canalFeedback}`)
    );
  }
  botoes.addComponents(btn(`livraria:apagar:${id}`, 'Apagar livro', '🗑️', ButtonStyle.Danger));

  let msg;
  try {
    msg = await canalLivros.send({
      content: `📚 Novo livro de <@${member.id}>!`,
      embeds,
      files: [new AttachmentBuilder(capaBuf, { name: capaNome }), new AttachmentBuilder(pdfBuf, { name: pdfNome })],
      components: [botoes],
      allowedMentions: { parse: [] },
    });
  } catch (erro) {
    console.error('[Livraria] erro ao publicar:', erro);
    return interaction.editReply('⚠️ Não consegui publicar. O PDF pode ser grande demais para este servidor. Tente um arquivo menor.');
  }

  N.salvarLivro({
    id,
    userId: member.id,
    titulo: s.titulo,
    autor: s.autor,
    classe: s.classe,
    canalId: canalLivros.id,
    msgId: msg.id,
    data: Date.now(),
    notas: {},
  });
  db.remover(chave(userId));

  await interaction.message.edit({ components: [] }).catch(() => {});
  await interaction.editReply('✅ Livro publicado!');
  await canal.send(`🎉 **${s.titulo}** foi publicado: ${msg.url}\nEste canal será apagado em 1 minuto.`);
  setTimeout(() => canal.delete('Livro publicado').catch(() => {}), 60 * 1000);
}

// ---------- Apagar livro ----------

function podeApagar(interaction, livro) {
  return (
    interaction.user.id === livro.userId ||
    (interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageMessages))
  );
}

async function pedirApagar(interaction, bookId) {
  const livro = N.pegarLivro(bookId);
  if (!livro) return interaction.reply({ content: 'Esse livro já foi removido.', flags: EPH });
  if (!podeApagar(interaction, livro)) {
    return interaction.reply({ content: 'Só o autor ou a staff pode apagar este livro.', flags: EPH });
  }
  return interaction.reply({
    content: `Apagar **${livro.titulo}**? Isso remove a publicação da livraria.`,
    components: [new ActionRowBuilder().addComponents(btn(`livraria:apagarok:${bookId}`, 'Sim, apagar', '🗑️', ButtonStyle.Danger))],
    flags: EPH,
  });
}

async function confirmarApagar(interaction, bookId) {
  const livro = N.pegarLivro(bookId);
  if (!livro) return interaction.update({ content: 'Esse livro já foi removido.', components: [] });
  if (!podeApagar(interaction, livro)) {
    return interaction.update({ content: 'Só o autor ou a staff pode apagar este livro.', components: [] });
  }
  const canal = interaction.guild.channels.cache.get(livro.canalId);
  if (canal) await canal.messages.delete(livro.msgId).catch(() => {});
  N.removerLivro(bookId);
  return interaction.update({ content: '🗑️ Livro removido da livraria.', components: [] });
}

// ---------- Feedback ----------

async function abrirFeedback(interaction) {
  const r = db.get(rascunho(interaction.user.id), {}) || {};
  const modal = new ModalBuilder()
    .setCustomId('livraria:modalfeedback')
    .setTitle('Feedback de livro')
    .addComponents(
      entrada('titulo', 'Título do livro', TextInputStyle.Short, 100, r.titulo),
      entrada('autor', 'Nick e nome do autor na house', TextInputStyle.Short, 80, r.autor),
      entrada('feedback', 'Seu feedback do livro', TextInputStyle.Paragraph, 1500, r.texto, 20),
      entrada('nota', 'Nota final (0 a 10)', TextInputStyle.Short, 4, r.nota)
    );
  return interaction.showModal(modal);
}

async function receberFeedback(interaction) {
  const titulo = interaction.fields.getTextInputValue('titulo').trim();
  const autor = interaction.fields.getTextInputValue('autor').trim();
  const texto = interaction.fields.getTextInputValue('feedback').trim();
  const notaTxt = interaction.fields.getTextInputValue('nota').trim();
  const nota = Number(notaTxt.replace(',', '.'));

  db.set(rascunho(interaction.user.id), { titulo, autor, texto, nota: notaTxt });

  if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
    return interaction.reply({
      content: '❌ A nota precisa ser um número de **0 a 10**. Clique em **Corrigir** para continuar de onde parou.',
      components: [new ActionRowBuilder().addComponents(btn('livraria:fbcorrigir', 'Corrigir', '✏️', ButtonStyle.Primary))],
      flags: EPH,
    });
  }

  const guild = interaction.guild;
  const destino = guild.channels.cache.get(N.cfg('canalFeedbacks') || N.cfg('canalFeedback'));
  if (!destino) {
    return interaction.reply({ content: '⚠️ O canal de feedbacks não está configurado. Avise a staff.', flags: EPH });
  }

  const notaFinal = Math.round(nota * 10) / 10;
  const livro = N.acharPorTitulo(titulo);

  let media = null;
  if (livro && livro.userId !== interaction.user.id) {
    livro.notas = { ...(livro.notas || {}), [interaction.user.id]: notaFinal };
    N.salvarLivro(livro);
  }
  if (livro) media = N.mediaDoLivro(livro);

  const cor = notaFinal >= 7 ? 0x2ecc71 : notaFinal >= 4 ? 0xf1c40f : 0xe74c3c;
  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle(`💬 Feedback — ${titulo}`.slice(0, 256))
    .setDescription(texto.slice(0, 4000))
    .addFields(
      { name: '✍️ Autor(a)', value: livro ? `${autor} (<@${livro.userId}>)` : autor, inline: true },
      { name: '🧑 Avaliador(a)', value: `<@${interaction.user.id}>`, inline: true },
      { name: '⭐ Nota final', value: `**${notaFinal}**/10`, inline: true }
    )
    .setTimestamp();
  if (livro) {
    embed.addFields({
      name: '📖 Livro',
      value: `[Abrir na livraria](https://discord.com/channels/${guild.id}/${livro.canalId}/${livro.msgId})`,
    });
  }
  if (media) {
    embed.setFooter({ text: `Média do livro: ${media.media.toFixed(1)}/10 (${media.total} avaliação(ões))` });
  }

  const opcoes = { embeds: [embed], allowedMentions: { parse: [] } };
  if (livro) {
    opcoes.content = `<@${livro.userId}>`;
    opcoes.allowedMentions = { users: [livro.userId] };
  }
  await destino.send(opcoes);
  db.remover(rascunho(interaction.user.id));

  return interaction.reply({ content: `✅ Feedback enviado em ${destino}. Obrigado!`, flags: EPH });
}

module.exports = {
  iniciarPublicacao,
  abrirModalTexto,
  receberTexto,
  receberMensagem,
  escolherClasse,
  trocarCapa,
  trocarPdf,
  cancelar,
  publicar,
  pedirApagar,
  confirmarApagar,
  abrirFeedback,
  receberFeedback,
};
