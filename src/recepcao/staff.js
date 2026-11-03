// Painel da staff dentro do canal da recepção (botão "Staff"):
// mostrar moldes, chamar o membro, ver detalhes, reiniciar, remover o nome e apagar o canal.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
} = require('discord.js');
const db = require('../db');
const U = require('./util');
const F = require('./fluxo');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;

const botao = (acao, userId, rotulo, emoji, estilo = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(`recepcao:${acao}:${userId}`).setLabel(rotulo).setEmoji(emoji).setStyle(estilo);

function painelEmbed(userId, sessao) {
  let texto = `Atendimento de <@${userId}>`;
  if (sessao && sessao.assumido) texto += `\n🙋 Assumido por <@${sessao.assumido.por}>`;
  return new EmbedBuilder().setColor(COR).setTitle('🛠️ Painel da staff').setDescription(texto);
}

function botoesPainel(userId) {
  return [
    new ActionRowBuilder().addComponents(
      botao('sf-moldes', userId, 'Mostrar moldes', '📋'),
      botao('sf-chamar', userId, 'Chamar membro', '🔔'),
      botao('sf-info', userId, 'Detalhes', 'ℹ️')
    ),
    new ActionRowBuilder().addComponents(
      botao('sf-reiniciar', userId, 'Reiniciar', '🔄'),
      botao('sf-nome', userId, 'Remover nome', '🏷️'),
      botao('sf-apagar', userId, 'Apagar canal', '🗑️', ButtonStyle.Danger)
    ),
  ];
}

const AVISOS = {
  nome: (u) => `🏷️ Remover o nome de <@${u}>?\nO apelido volta ao normal e o personagem escolhido é apagado (ele escolhe de novo).`,
  reiniciar: (u) => `🔄 Reiniciar a recepção de <@${u}>?\nEle volta ao passo 1 (nome do personagem). O apelido não muda.`,
  apagar: () => '🗑️ Apagar este canal da recepção?\nNão dá para desfazer.',
};

// Botão "Staff" da primeira mensagem: abre o painel só para quem é da staff
async function abrirPainel(interaction, userId) {
  if (!F.ehStaffRecepcao(interaction)) {
    return interaction.reply({ content: '❌ Só a staff pode abrir esse painel.', flags: EPH });
  }
  const sessao = db.get(chave(userId));
  if (!sessao) return interaction.reply({ content: 'Essa recepção já foi encerrada.', flags: EPH });
  return interaction.reply({ embeds: [painelEmbed(userId, sessao)], components: botoesPainel(userId), flags: EPH });
}

// Zera os dados do personagem e volta para o passo 1 (mantém canal, teste, mensagem inicial e "assumido")
function zerarPersonagem(userId, sessao) {
  const { personagem, molde, emoji, nick, pedido, proposta, avisouNome, avisouEmoji, ...resto } = sessao;
  db.set(chave(userId), { ...resto, etapa: 'personagem' });
}

async function mostrarMoldes(interaction, sessao) {
  const nome = sessao.personagem || 'Personagem';
  const emoji = sessao.emoji || U.emojis()[0] || '✨';
  const linhas = U.moldes().map((m, i) => `**${i + 1}.** ${U.montarNick(m, nome, emoji)}`);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📋 Moldes de nome')
    .setDescription(linhas.join('\n').slice(0, 4000))
    .setFooter({ text: `Exemplo com "${nome}" e ${emoji}. O apelido final tem no máximo 32 caracteres.` });
  await interaction.channel.send({ embeds: [embed] });
  return interaction.reply({ content: '✅ Moldes enviados no canal.', flags: EPH });
}

async function chamar(interaction, userId) {
  await interaction.channel.send({
    content: `🔔 <@${userId}>, a staff está te chamando por aqui!`,
    allowedMentions: { users: [userId] },
  });
  return interaction.reply({ content: '✅ Membro chamado.', flags: EPH });
}

async function detalhes(interaction, userId, sessao) {
  const membro = await interaction.guild.members.fetch(userId).catch(() => null);
  const etapas = { personagem: 'Escolhendo o personagem', molde: 'Escolhendo o molde', emoji: 'Escolhendo o emoji', passos: 'Fazendo os passos', aguardando: 'Aguardando a staff autorizar' };
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('ℹ️ Detalhes da recepção')
    .setDescription(`<@${userId}>`)
    .addFields(
      { name: 'Etapa', value: etapas[sessao.etapa] || String(sessao.etapa), inline: true },
      { name: 'Personagem', value: sessao.personagem || '—', inline: true },
      { name: 'Apelido', value: sessao.nick || '—', inline: true },
      { name: 'Entrou', value: membro && membro.joinedTimestamp ? `<t:${Math.floor(membro.joinedTimestamp / 1000)}:R>` : '—', inline: true },
      { name: 'Atendimento', value: sessao.assumido ? `Staff (<@${sessao.assumido.por}>)` : 'Atlas', inline: true },
      { name: 'Teste', value: sessao.teste ? 'Sim' : 'Não', inline: true }
    );
  return interaction.reply({ embeds: [embed], flags: EPH });
}

function pedirConfirmacao(interaction, qual, userId) {
  const linha = new ActionRowBuilder().addComponents(
    botao(`sfc-${qual}`, userId, 'Confirmar', '✅', ButtonStyle.Danger),
    botao('sf-voltar', userId, 'Voltar', '↩️')
  );
  return interaction.update({ content: `⚠️ ${AVISOS[qual](userId)}`, embeds: [], components: [linha] });
}

async function removerNome(interaction, userId, sessao) {
  const membro = await interaction.guild.members.fetch(userId).catch(() => null);
  let aviso = '';
  if (!membro) aviso = '\n⚠️ O membro não está mais no servidor.';
  else {
    await membro.setNickname(null, `Recepção: nome removido por ${interaction.user.username}`).catch(() => {
      aviso = '\n⚠️ Não consegui mexer no apelido (o cargo dele pode estar acima do meu).';
    });
  }
  zerarPersonagem(userId, sessao);
  await interaction.update({ content: `✅ Nome removido.${aviso}`, embeds: [], components: [] });
  if (!sessao.assumido) {
    await interaction.channel
      .send({ content: `🏷️ <@${userId}>, a staff removeu o seu nome. Me envie de novo o nome do **personagem**.`, allowedMentions: { users: [userId] } })
      .catch(() => {});
  }
}

async function reiniciar(interaction, userId, sessao) {
  zerarPersonagem(userId, sessao);
  await interaction.update({ content: '✅ Recepção reiniciada.', embeds: [], components: [] });
  if (!sessao.assumido) {
    await interaction.channel
      .send({ content: `🔄 <@${userId}>, a staff reiniciou a sua recepção. Me envie o nome do **personagem**.`, allowedMentions: { users: [userId] } })
      .catch(() => {});
  }
}

async function apagar(interaction, userId) {
  const canal = interaction.channel;
  db.remover(chave(userId));
  await interaction.update({ content: '🗑️ Apagando o canal...', embeds: [], components: [] });
  setTimeout(() => canal.delete(`Recepção apagada por ${interaction.user.username}`).catch(() => {}), 1500);
}

// Todos os botões "sf-..." e "sfc-..." (a checagem de staff é feita aqui)
async function tratar(interaction, acao, userId) {
  if (!F.ehStaffRecepcao(interaction)) {
    return interaction.reply({ content: '❌ Só a staff pode usar isso.', flags: EPH });
  }
  const sessao = db.get(chave(userId));
  if (!sessao) {
    return interaction.update({ content: 'Essa recepção já foi encerrada.', embeds: [], components: [] });
  }

  switch (acao) {
    case 'sf-voltar': return interaction.update({ content: '', embeds: [painelEmbed(userId, sessao)], components: botoesPainel(userId) });
    case 'sf-moldes': return mostrarMoldes(interaction, sessao);
    case 'sf-chamar': return chamar(interaction, userId);
    case 'sf-info': return detalhes(interaction, userId, sessao);
    case 'sf-nome': return pedirConfirmacao(interaction, 'nome', userId);
    case 'sf-reiniciar': return pedirConfirmacao(interaction, 'reiniciar', userId);
    case 'sf-apagar': return pedirConfirmacao(interaction, 'apagar', userId);
    case 'sfc-nome': return removerNome(interaction, userId, sessao);
    case 'sfc-reiniciar': return reiniciar(interaction, userId, sessao);
    case 'sfc-apagar': return apagar(interaction, userId);
    default: return undefined;
  }
}

module.exports = { abrirPainel, tratar };
