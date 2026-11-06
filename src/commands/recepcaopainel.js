const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const F = require('../recepcao/fluxo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaopainel')
    .setDescription('Posta o painel para membros sem vaga reabrirem a própria recepção (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o
        .setName('canal')
        .setDescription('Onde postar o painel (padrão: o canal atual)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    ),

  async execute(interaction) {
    const responder = (content) => interaction.reply({ content, flags: EPH });
    if (!interaction.inGuild()) return responder('Use este comando no servidor.');
    if (!F.ehStaffRecepcao(interaction)) return responder('❌ Só a staff pode postar este painel.');

    const canal = interaction.options.getChannel('canal') || interaction.channel;

    const embed = new EmbedBuilder()
      .setColor(0xf5a3c7)
      .setTitle('🔄 Reabrir minha recepção')
      .setDescription(
        'Está **sem vaga** e a sua recepção sumiu ou foi encerrada?\n\n' +
          'Aperte o botão abaixo e o Atlas abre uma recepção nova para você, do zero.\n\n' +
          '_Disponível só para quem tem o cargo de sem vaga._'
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('recpainel:reabrir')
        .setLabel('Reabrir minha recepção')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary)
    );

    try {
      await canal.send({ embeds: [embed], components: [botoes] });
    } catch (erro) {
      console.error('[Recepção] painel:', erro);
      return responder(`⚠️ Não consegui postar em ${canal}. Confira se o Atlas pode enviar mensagens lá.`);
    }
    return responder(`✅ Painel postado em ${canal}.`);
  },
};
