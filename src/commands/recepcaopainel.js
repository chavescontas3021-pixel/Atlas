const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const F = require('../recepcao/fluxo');
const UI = require('../ui/componentes');

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
    if (!interaction.inGuild()) return interaction.reply(UI.erro('Use este comando no servidor.'));
    if (!F.ehStaffRecepcao(interaction)) return interaction.reply(UI.erro('Só a staff pode postar este painel.'));

    const canal = interaction.options.getChannel('canal') || interaction.channel;

    const embed = UI.painel({
      trilha: ['Recepção'],
      titulo: 'Reabrir minha recepção',
      descricao:
        'Está **sem vaga** e a sua recepção sumiu ou foi encerrada?\n\n' +
        'Aperte o botão abaixo e o Atlas abre uma recepção nova para você, do zero.',
      rodape: 'Disponível só para quem tem o cargo de sem vaga',
    });

    try {
      await canal.send({ embeds: [embed], components: [UI.botoes([{ id: 'recpainel:reabrir', label: 'Reabrir minha recepção' }])] });
    } catch (erro) {
      console.error('[Recepção] painel:', erro);
      return interaction.reply(UI.erro(`Não consegui postar em ${canal}. Confira se o Atlas pode enviar mensagens lá.`));
    }
    return interaction.reply(UI.ok(`Painel postado em ${canal}.`));
  },
};
