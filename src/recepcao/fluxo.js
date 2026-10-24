const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../db');
const U = require('./util');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;
const emAndamento = new Set();

function variaveis(member, sessao) {
  return {
    usuario: `<@${member.id}>`,
    servidor: member.guild.name,
    personagem: (sessao && sessao.personagem) || '',
    nick: (sessao && sessao.nick) || '',
    emoji: (sessao && sessao.emoji) || '',
  };
}

// Cria o canal privado da recepção
async function criarCanal(member) {
  const guild = member.guild;
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const P = PermissionFlagsBits;
  const basico = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory];

  const permissoes = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: member.id, allow: basico },
    { id: eu.id, allow: [...basico, P.ManageChannels, P.EmbedLinks] },
  ];
  const staff = U.cfg('cargos.staff');
  if (staff && guild.roles.cache.has(staff)) permissoes.push({ id: staff, allow: basico });

  const nome = ('recepcao-' + member.user.username).toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 90);
  const opcoes = {
    name: nome,
    type: ChannelType.GuildText,
    topic: `Recepção de ${member.user.username}`,
    permissionOverwrites: permissoes,
  };
  const categoria = U.cfg('categoria');
  if (categoria && guild.channels.cache.has(categoria)) opcoes.parent = categoria;

  return guild.channels.create(opcoes);
}

// Começa a recepção de um membro (usado ao entrar e no /recepcao testar)
async function iniciarRecepcao(member, { teste = false } = {}) {
  const guild = member.guild;

  const semVaga = U.cfg('cargos.semVaga');
  if (!teste && semVaga && guild.roles.cache.has(semVaga)) {
    await member.roles
      .add(semVaga, 'Recepção do Atlas')
      .catch((e) => console.error('[Recepção] cargo sem vaga:', e.message));
  }

  const antiga = db.get(chave(member.id));
  if (antiga) {
    const c = await guild.channels.fetch(antiga.canalId).catch(() => null);
    if (c) await c.delete('Nova recepção').catch(() => {});
  }

  const canal = await criarCanal(member);
  db.set(chave(member.id), { canalId: canal.id, etapa: 'personagem', teste });

  const msg = U.mensagem('boasVindas');
  const vars = variaveis(member, null);
  await canal.send({
    content: `<@${member.id}>`,
    embeds: [
      new EmbedBuilder()
        .setColor(COR)
        .setTitle(U.preencher(msg.titulo, vars))
        .setDescription(U.preencher(msg.texto, vars)),
    ],
  });
  return canal;
}

async function enviarMoldes(canal, userId, personagem) {
  const lista = U.moldes().slice(0, 25);
  const exemplo = U.emojis()[0] || '✨';
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`recepcao:molde:${userId}`)
    .setPlaceholder('Escolha o molde do seu nome')
    .addOptions(
      lista.map((m, i) => ({
        label: U.montarNick(m, personagem, exemplo).slice(0, 100) || `Molde ${i + 1}`,
        description: `Molde ${i + 1}`,
        value: String(i),
      }))
    );
  await canal.send({
    content: `✅ **${personagem}** está livre! Agora escolha o **molde** do seu nome:`,
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

async function enviarEmojis(canal, userId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`recepcao:emoji:${userId}`)
    .setPlaceholder('Escolha o seu emoji')
    .addOptions(U.emojis().slice(0, 25).map((e) => ({ label: e, value: e })));
  await canal.send({
    content: 'Agora escolha o **emoji** do seu nome. Se preferir outro, **envie aqui no chat** o emoji que você quer.',
    components: [new ActionRowBuilder().addComponents(menu)],
  });
}

// Quando o membro escreve o nome do personagem no chat
async function receberPersonagem(message) {
  const userId = message.author.id;
  if (emAndamento.has(userId)) return;

  const nome = message.content.trim().replace(/\s+/g, ' ');
  if (!nome || nome.length > 40) {
    await message.reply('Me envie só o **nome do personagem** (até 40 caracteres).');
    return;
  }

  emAndamento.add(userId);
  try {
    await message.channel.sendTyping().catch(() => {});
    const r = await U.procurarVaga(message.guild, nome, userId);

    if (r.erro) {
      await message.reply(`⚠️ ${r.erro} Chame a staff, por favor.`);
      return;
    }
    if (r.ocupada && !r.fechada) {
      await message.reply(`😕 **${nome}** já está ocupado: ${r.ocupada.url}\nEscolha outro personagem e me envie o nome.`);
      return;
    }

    const sessao = db.get(chave(userId));
    if (!sessao || sessao.etapa !== 'personagem') return;
    db.set(chave(userId), { ...sessao, personagem: nome, etapa: 'molde' });
    await enviarMoldes(message.channel, userId, nome);
  } finally {
    emAndamento.delete(userId);
  }
}

// Quando o membro escreve um emoji no chat
async function receberEmoji(message) {
  const texto = message.content.trim();
  if (!texto || /[\p{L}\p{N}]/u.test(texto) || Array.from(texto).length > 8) {
    await message.reply('Me envie só um emoji ou símbolo (sem letras), tipo 🌸 ou ✦.');
    return;
  }
  await message.react('✅').catch(() => {});
  const member = message.member ?? (await message.guild.members.fetch(message.author.id));
  await aplicarNome(message.channel, member, texto);
}

// Troca o apelido e manda a mensagem com os passos
async function aplicarNome(canal, member, emoji) {
  const sessao = db.get(chave(member.id));
  if (!sessao || sessao.etapa !== 'emoji') return;

  const lista = U.moldes();
  const molde = lista[sessao.molde] || lista[0];
  const nick = U.montarNick(molde, sessao.personagem, emoji);

  let aviso = '';
  try {
    await member.setNickname(nick, 'Recepção do Atlas');
  } catch (e) {
    aviso = `\n⚠️ Não consegui trocar seu apelido sozinho. Peça para a staff colocar: **${nick}**`;
  }

  const nova = { ...sessao, emoji, nick, etapa: 'passos' };
  db.set(chave(member.id), nova);

  const msg = U.mensagem('passos');
  const vars = variaveis(member, nova);
  const lista2 = U.PASSOS.map((p, i) => {
    const id = U.cfg(`canais.${p.id}`);
    return `**${i + 1}. ${p.nome}** — ${id ? `<#${id}>` : '*canal não configurado*'}\n${p.desc}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(U.preencher(msg.titulo, vars))
    .setDescription(`${U.preencher(msg.texto, vars)}\n\n${lista2}`);

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`recepcao:verificar:${member.id}`)
      .setLabel('Verificar')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recepcao:trocar:${member.id}`)
      .setLabel('Trocar personagem')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  await canal.send({ content: `<@${member.id}>${aviso}`, embeds: [embed], components: [botoes] });
}

async function etapaInvalida(interaction) {
  return interaction.reply({ content: 'Essa etapa já foi concluída.', flags: EPH });
}

async function escolherMolde(interaction) {
  const userId = interaction.customId.split(':')[2];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse menu não é para você 💜', flags: EPH });
  }
  const sessao = db.get(chave(userId));
  if (!sessao || sessao.etapa !== 'molde') return etapaInvalida(interaction);

  const indice = Number(interaction.values[0]);
  const molde = U.moldes()[indice];
  if (!molde) return etapaInvalida(interaction);

  db.set(chave(userId), { ...sessao, molde: indice, etapa: 'emoji' });
  await interaction.update({ content: `✅ Molde escolhido: \`${molde}\``, components: [] });
  await enviarEmojis(interaction.channel, userId);
}

async function escolherEmoji(interaction) {
  const userId = interaction.customId.split(':')[2];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse menu não é para você 💜', flags: EPH });
  }
  const sessao = db.get(chave(userId));
  if (!sessao || sessao.etapa !== 'emoji') return etapaInvalida(interaction);

  const emoji = interaction.values[0];
  await interaction.update({ content: `✅ Emoji escolhido: ${emoji}`, components: [] });
  await aplicarNome(interaction.channel, interaction.member, emoji);
}

// Botão "Trocar personagem"
async function trocar(interaction) {
  const sessao = db.get(chave(interaction.user.id));
  if (!sessao) return interaction.reply({ content: 'Não achei sua recepção.', flags: EPH });

  db.set(chave(interaction.user.id), { canalId: sessao.canalId, etapa: 'personagem', teste: sessao.teste });
  await interaction.update({ components: [] });
  await interaction.channel.send('🔄 Tudo bem! Me envie o nome do **novo personagem**.');
}

// Botão "Verificar"
async function verificar(interaction) {
  await interaction.deferReply({ flags: EPH });

  const member = interaction.member;
  const sessao = db.get(chave(member.id));
  if (!sessao || sessao.etapa !== 'passos') {
    return interaction.editReply('Não achei sua recepção em andamento.');
  }

  const r = await U.procurarVaga(interaction.guild, sessao.personagem, member.id);
  if (r.erro) return interaction.editReply(`⚠️ ${r.erro} Avise a staff.`);

  if (!r.fechada) {
    const id = U.cfg('canais.fechar_vaga');
    return interaction.editReply(
      `❌ Ainda não encontrei a sua vaga de **${sessao.personagem}** fechada em <#${id}>.\n` +
        'Feche a vaga lá (com o nome do personagem) e aperte **Verificar** de novo.'
    );
  }

  const semVaga = U.cfg('cargos.semVaga');
  const verificado = U.cfg('cargos.verificado');
  const problemas = [];

  if (semVaga && member.roles.cache.has(semVaga)) {
    await member.roles.remove(semVaga, 'Verificado pelo Atlas').catch(() => problemas.push('tirar o cargo de sem vaga'));
  }
  if (verificado) {
    await member.roles.add(verificado, 'Verificado pelo Atlas').catch(() => problemas.push('dar o cargo de verificado'));
  } else {
    problemas.push('dar o cargo de verificado (cargo não configurado)');
  }

  if (problemas.length) {
    return interaction.editReply(
      `⚠️ Sua vaga está certa, mas não consegui ${problemas.join(' e ')}. Avise a staff.`
    );
  }

  const seg = Number(U.cfg('apagarSegundos', U.PADROES.apagarSegundos));
  const msg = U.mensagem('sucesso');
  const vars = variaveis(member, sessao);
  let texto = U.preencher(msg.texto, vars);
  if (seg > 0) texto += `\n\n*Este canal será apagado em ${seg} segundos.*`;

  await interaction.channel.send({
    embeds: [new EmbedBuilder().setColor(COR).setTitle(U.preencher(msg.titulo, vars)).setDescription(texto)],
  });
  await interaction.message.edit({ components: [] }).catch(() => {});
  db.remover(chave(member.id));
  await interaction.editReply('✅ Verificado!');

  if (seg > 0) {
    const canal = interaction.channel;
    setTimeout(() => canal.delete('Recepção concluída').catch(() => {}), seg * 1000);
  }
}

module.exports = {
  iniciarRecepcao,
  receberPersonagem,
  receberEmoji,
  escolherMolde,
  escolherEmoji,
  trocar,
  verificar,
};
