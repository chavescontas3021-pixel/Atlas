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
const T = require('./textos');
const Ajuda = require('./ajuda');
const P = require('./passos');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;
const emAndamento = new Set();

// ---------- Assumir atendimento (staff) ----------
function botaoAssumir(userId, assumido) {
  return new ButtonBuilder()
    .setCustomId(`recepcao:assumir:${userId}`)
    .setLabel(assumido ? 'Devolver ao Atlas' : 'Assumir atendimento')
    .setEmoji(assumido ? '🤖' : '🙋')
    .setStyle(assumido ? ButtonStyle.Secondary : ButtonStyle.Danger);
}

// Botões da primeira mensagem: [Sou apenas representante] [Assumir/Devolver] [Solicitar ajuda] [Staff]
function linhaAssumir(userId, assumido) {
  const linha = new ActionRowBuilder();
  if (T.repDisponivel()) {
    linha.addComponents(
      new ButtonBuilder()
        .setCustomId(`recepcao:rep:${userId}`)
        .setLabel('Sou apenas representante')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Primary)
    );
  }
  linha.addComponents(botaoAssumir(userId, assumido));
  if (Ajuda.ativo()) linha.addComponents(Ajuda.botao(userId));
  linha.addComponents(
    new ButtonBuilder()
      .setCustomId(`recepcao:staff:${userId}`)
      .setLabel('Staff')
      .setEmoji('🛠️')
      .setStyle(ButtonStyle.Secondary)
  );
  return linha;
}

// Staff = quem tem Gerenciar Servidor ou o cargo de staff da recepção
function ehStaffRecepcao(interaction) {
  const p = interaction.memberPermissions;
  if (p && p.has(PermissionFlagsBits.ManageGuild)) return true;
  const cargo = U.cfg('cargos.staff');
  return !!(cargo && interaction.member && interaction.member.roles.cache.has(cargo));
}

// true quando a staff assumiu o atendimento desse membro (o bot fica em silêncio)
function estaAssumido(userId) {
  const s = db.get(chave(userId));
  return !!(s && s.assumido);
}

// Texto mostrado ao membro enquanto a staff está com o atendimento (editável no site)
const msgAssumido = () => T.preencher(T.mensagem('assumido').texto, {});

// Botão "Assumir atendimento" / "Devolver ao Atlas"
async function alternarAtendimento(interaction, userId) {
  const sessao = db.get(chave(userId));
  if (!sessao) {
    return interaction.reply({ content: 'Essa recepção já foi encerrada.', flags: EPH });
  }
  if (!ehStaffRecepcao(interaction)) {
    return interaction.reply({ content: '❌ Só a staff pode assumir o atendimento.', flags: EPH });
  }

  const assumir = !sessao.assumido;
  const nova = { ...sessao };
  if (assumir) nova.assumido = { por: interaction.user.id, em: Date.now() };
  else delete nova.assumido;
  db.set(chave(userId), nova);

  await interaction.update({ components: [linhaAssumir(userId, assumir)] });

  const aviso = T.preencher(T.mensagem(assumir ? 'assumiu' : 'devolveu').texto, {
    staff: `<@${interaction.user.id}>`,
    usuario: `<@${userId}>`,
  });
  await interaction.channel
    .send({ content: aviso, allowedMentions: { users: [userId] } })
    .catch(() => {});
}

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
async function iniciarRecepcao(member, { teste = false, darCargo = false } = {}) {
  const guild = member.guild;

  // O cargo "sem vaga" vem do onboarding; o Atlas só o entrega se pedirem (darCargo)
  const semVaga = U.cfg('cargos.semVaga');
  if (darCargo && !teste && semVaga && guild.roles.cache.has(semVaga)) {
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

  // Primeira mensagem: texto simples (sem embed e sem banner), com os botões da recepção.
  // O membro é marcado no começo, a não ser que o texto já tenha {usuario}.
  const modelo = T.mensagem('inicio').texto;
  const texto = T.preencher(modelo, variaveis(member, null));
  const enviada = await canal.send({
    content: modelo.includes('{usuario}') ? texto : `<@${member.id}> ${texto}`,
    components: [linhaAssumir(member.id, false)],
    allowedMentions: { users: [member.id] },
  });
  db.set(chave(member.id), { ...db.get(chave(member.id)), msgInicial: enviada.id });
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

// Parece um nome de personagem? Conversa comum (pergunta, link, frase longa) não conta.
function pareceNome(bruto) {
  const t = String(bruto || '').trim();
  if (!t || t.length > 40) return false;
  if (/[\n?]/.test(t)) return false;
  if (/https?:\/\/|discord\.gg|<@|<#|@everyone|@here/i.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  return true;
}

// Confere a vaga do personagem e, estando livre, segue para a escolha do molde
async function conferirPersonagem(canal, userId, nome) {
  if (emAndamento.has(userId)) return;
  emAndamento.add(userId);
  try {
    await canal.sendTyping().catch(() => {});
    const r = await U.procurarVaga(canal.guild, nome, userId);

    if (r.erro) {
      await canal.send(`⚠️ ${r.erro} Chame a staff, por favor.`);
      return;
    }
    if (r.ocupada) {
      await canal.send(`😕 **${nome}** já está ocupado: ${r.ocupada.url}\nEscolha outro personagem e me envie o nome.`);
      return;
    }

    const sessao = db.get(chave(userId));
    if (!sessao || sessao.etapa !== 'personagem' || sessao.assumido) return;
    const { proposta, obra, obraPendente, obraConfere, avisouObra, ...resto } = sessao;
    if (U.cfg('perguntarObra', true) !== false) {
      // Antes do molde, pergunta a obra (deixa o registro de vagas organizado)
      db.set(chave(userId), { ...resto, personagem: nome, etapa: 'obra' });
      await canal.send(`✅ **${nome}** está livre!\nAgora me diga **de qual obra** ele é (anime, mangá, jogo, série...). Se não souber, escreva **pular**.`);
      return;
    }
    db.set(chave(userId), { ...resto, personagem: nome, etapa: 'molde' });
    await enviarMoldes(canal, userId, nome);
  } finally {
    emAndamento.delete(userId);
  }
}

// Pergunta "é esse mesmo?" antes de aceitar o nome
async function propor(message, nome) {
  const userId = message.author.id;
  const antes = db.get(chave(userId));
  if (antes && antes.proposta && antes.proposta.msgId) {
    const velha = await message.channel.messages.fetch(antes.proposta.msgId).catch(() => null);
    if (velha) await velha.delete().catch(() => {});
  }

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`recepcao:perssim:${userId}`).setLabel('Sim, é esse').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`recepcao:persnao:${userId}`).setLabel('Não, foi só uma mensagem').setEmoji('❌').setStyle(ButtonStyle.Secondary)
  );
  const enviada = await message.reply({
    content: T.preencher(T.mensagem('confirmarPersonagem').texto, { personagem: nome, usuario: `<@${userId}>` }),
    components: [botoes],
    allowedMentions: { parse: [], repliedUser: false },
  });
  const atual = db.get(chave(userId));
  if (atual) db.set(chave(userId), { ...atual, proposta: { nome, msgId: enviada.id } });
}

// Quando o membro escreve no chat durante a etapa do personagem
async function receberPersonagem(message) {
  const userId = message.author.id;
  const sessao = db.get(chave(userId));
  if (!sessao || sessao.etapa !== 'personagem') return;

  const bruto = message.content.trim();
  if (!pareceNome(bruto)) {
    // Conversa comum: o Atlas fica quieto (só orienta uma vez)
    if (bruto && !sessao.avisouNome) {
      db.set(chave(userId), { ...sessao, avisouNome: true });
      await message
        .reply({
          content: T.preencher(T.mensagem('dicaPersonagem').texto, { usuario: `<@${userId}>` }),
          allowedMentions: { parse: [], repliedUser: false },
        })
        .catch(() => {});
    }
    return;
  }

  const nome = bruto.replace(/\s+/g, ' ');
  if (!T.confirmarLigado()) return conferirPersonagem(message.channel, userId, nome);
  return propor(message, nome);
}

// Quando o membro escreve a obra do personagem: confere se ela existe (anime, filme, série, jogo...)
async function receberObra(message) {
  const O = require('../vagas/obras');
  const userId = message.author.id;
  const sessao = db.get(chave(userId));
  if (!sessao || sessao.etapa !== 'obra') return;
  const bruto = message.content.trim().replace(/\s+/g, ' ');
  if (!bruto) return;
  const invalida = bruto.length > 60 || /\n/.test(message.content) || (/\?\s*$/.test(bruto) && bruto.split(' ').length > 2)
    || /https?:\/\/|discord\.gg|<@|<#|@everyone|@here/i.test(bruto);
  const responder = (texto) => message.reply({ content: texto, allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
  if (invalida) {
    if (!sessao.avisouObra) {
      db.set(chave(userId), { ...sessao, avisouObra: true });
      await responder('Me envie só o **nome da obra** (ex: Naruto, One Piece, Breaking Bad). Se não souber, escreva **pular**.');
    }
    return;
  }
  if (emAndamento.has(userId)) return;
  emAndamento.add(userId);
  try {
    const t = bruto.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const pend = sessao.obraPendente || null;
    const { obraPendente, avisouObra, ...resto } = sessao;
    const seguir = async (obra, confere, aviso) => {
      db.set(chave(userId), { ...resto, obra, obraConfere: confere, etapa: 'molde' });
      await message.react('✅').catch(() => {});
      if (aviso) await message.channel.send(aviso).catch(() => {});
      await enviarMoldes(message.channel, userId, sessao.personagem);
    };

    if (/^(pular|nao sei)$/.test(t)) return await seguir('', false);
    if (pend) {
      if (pend.sugestao && /^(sim|s|isso|isso mesmo|e esse|e essa)$/.test(t)) {
        return await seguir(pend.sugestao, true, `📚 Obra: **${pend.sugestao}**${pend.tipo ? ` (${pend.tipo})` : ''}`);
      }
      if (/^(manter|manter assim)$/.test(t)) return await seguir(pend.digitada, false);
      if (/^(nao|n)$/.test(t)) {
        await responder('Tudo bem! Me envie o **nome certo** da obra, ou escreva **manter** para usar como você digitou.');
        return;
      }
    }

    await message.channel.sendTyping().catch(() => {});
    const r = await O.verificar(bruto);
    if (r.status === 'ok') return await seguir(r.titulo, true, `📚 Obra: **${r.titulo}** (${r.tipo})`);
    if (r.status === 'erro') return await seguir(bruto, false); // serviços fora do ar: aceita e a staff confere depois

    db.set(chave(userId), { ...resto, obraPendente: r.status === 'sugestao' ? { digitada: bruto, sugestao: r.titulo, tipo: r.tipo } : { digitada: bruto } });
    await responder(r.status === 'sugestao'
      ? `🤔 Não achei exatamente **${bruto}**. Você quis dizer **${r.titulo}**${r.tipo ? ` (${r.tipo})` : ''}?\nResponda **sim**, envie o nome certo ou escreva **manter** para usar como digitou.`
      : `🤔 Não encontrei a obra **${bruto}**. Confira a escrita e me envie de novo.\nSe tiver certeza (obra pouco conhecida ou original), escreva **manter**.`);
  } finally {
    emAndamento.delete(userId);
  }
}

// Botão "Sim, é esse"
async function confirmarPersonagem(interaction) {
  const userId = interaction.user.id;
  const sessao = db.get(chave(userId));
  if (!sessao || sessao.etapa !== 'personagem' || !sessao.proposta || sessao.proposta.msgId !== interaction.message.id) {
    return interaction.update({ content: 'Essa pergunta já foi respondida.', components: [] }).catch(() => {});
  }
  const nome = sessao.proposta.nome;
  await interaction.update({ content: `🔎 Conferindo a vaga de **${nome}**...`, components: [] });
  try {
    await conferirPersonagem(interaction.channel, userId, nome);
  } finally {
    await interaction.message.delete().catch(() => {});
  }
}

// Botão "Não, foi só uma mensagem"
async function cancelarPersonagem(interaction) {
  const userId = interaction.user.id;
  const sessao = db.get(chave(userId));
  if (sessao && sessao.proposta && sessao.proposta.msgId === interaction.message.id) {
    const { proposta, ...resto } = sessao;
    db.set(chave(userId), resto);
  }
  await interaction.deferUpdate().catch(() => {});
  await interaction.message.delete().catch(() => {});
}

// Quando o membro escreve um emoji no chat
async function receberEmoji(message) {
  const texto = message.content.trim();
  if (!texto || /[\p{L}\p{N}]/u.test(texto) || Array.from(texto).length > 8) {
    // Conversa comum: o Atlas fica quieto (só orienta uma vez)
    const sessao = db.get(chave(message.author.id));
    if (texto && sessao && !sessao.avisouEmoji) {
      db.set(chave(message.author.id), { ...sessao, avisouEmoji: true });
      await message.reply({ content: T.mensagem('dicaEmoji').texto, allowedMentions: { parse: [], repliedUser: false } }).catch(() => {});
    }
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

  // A mensagem de passos fica em recepcao/passos.js (a mesma do botão "Passos" da staff)
  const embed = P.embedPassos(member.guild.name, member.id, nova);
  const botoes = P.botoesPassos(member.id);

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

  // Zera só os dados do personagem; mantém canal, teste, mensagem inicial e "assumido"
  const { personagem, molde, emoji, nick, pedido, proposta, ...mantem } = sessao;
  db.set(chave(interaction.user.id), { ...mantem, etapa: 'personagem' });
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
  receberObra,
  receberEmoji,
  escolherMolde,
  escolherEmoji,
  trocar,
  verificar,
  alternarAtendimento,
  estaAssumido,
  msgAssumido,
  ehStaffRecepcao,
  confirmarPersonagem,
  cancelarPersonagem,
};
