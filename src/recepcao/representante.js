const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags,
} = require('discord.js');
const db = require('../db');
const U = require('./util');
const T = require('./textos');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;

async function pedir(interaction, userId) {
  const sessao = db.get(chave(userId));
  if (!sessao) return interaction.reply({ content: 'Essa recepção já foi encerrada.', flags: EPH });
  if (!T.repDisponivel()) return interaction.reply({ content: 'Essa opção não está disponível agora.', flags: EPH });

  const msg = T.mensagem('repConfirmar');
  const vars = { usuario: `<@${userId}>`, servidor: interaction.guild.name };
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(T.preencher(msg.titulo, vars))
    .setDescription(T.preencher(msg.texto, vars));
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`recepcao:repsim:${userId}`).setLabel('Sim, sou apenas representante').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`recepcao:repnao:${userId}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
  );
  return interaction.reply({ embeds: [embed], components: [botoes], flags: EPH });
}

async function cancelar(interaction) {
  return interaction.update({ content: '👍 Tudo bem! Continue a recepção normalmente.', embeds: [], components: [] });
}

async function confirmar(interaction, userId) {
  const sessao = db.get(chave(userId));
  if (!sessao) {
    return interaction.update({ content: 'Essa recepção já foi encerrada.', embeds: [], components: [] });
  }
  await interaction.update({ content: '✅ Certo! Já te mostro os canais.', embeds: [], components: [] });

  const canal = interaction.channel;
  const member = interaction.member;

  const semVaga = U.cfg('cargos.semVaga');
  if (!sessao.teste && semVaga && member.roles.cache.has(semVaga)) {
    await member.roles.remove(semVaga, 'Disse que é apenas representante').catch(() => {});
  }
  db.set(`recepcao.reps.${userId}`, Date.now());

  const c = T.canais();
  const seg = Math.max(10, Number(U.cfg('apagarSegundos', U.PADROES.apagarSegundos)) || 60);
  const vars = {
    usuario: `<@${userId}>`,
    servidor: interaction.guild.name,
    canalParceria: c.parceria ? `<#${c.parceria}>` : '*(não configurado)*',
    canalAlianca: c.alianca ? `<#${c.alianca}>` : '*(não configurado)*',
    segundos: seg,
  };
  const msg = T.mensagem('rep');
  await canal
    .send({
      content: `<@${userId}>`,
      embeds: [new EmbedBuilder().setColor(COR).setTitle(T.preencher(msg.titulo, vars)).setDescription(T.preencher(msg.texto, vars))],
    })
    .catch(() => {});

  db.remover(chave(userId));
  setTimeout(() => canal.delete('Recepção: apenas representante').catch(() => {}), seg * 1000);
}

module.exports = { pedir, cancelar, confirmar };
