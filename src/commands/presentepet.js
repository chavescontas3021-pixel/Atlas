const {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const P = require('../extras/presentepet');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('presentepet')
    .setDescription('Entrega o pet ultra lendário Dragonfox como presente (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('membro').setDescription('Quem vai receber').setRequired(true))
    .addStringOption((o) => o.setName('nome').setDescription('Nome do pet (padrão: Dragonfox)').setMaxLength(30))
    .addBooleanOption((o) => o.setName('substituir').setDescription('Se a pessoa já tem um pet, troca pelo Dragonfox (o antigo é perdido)')),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: 'Use no servidor.', flags: EPH });
    const alvo = interaction.options.getUser('membro');
    if (alvo.bot) return interaction.reply({ content: '❌ Bots não podem receber pets.', flags: EPH });

    const atual = db.get(`extras.pets.${alvo.id}`, null);
    const substituir = !!interaction.options.getBoolean('substituir');
    if (atual && !substituir) {
      return interaction.reply({
        content: `❌ ${alvo} já tem um pet. Se quiser trocar mesmo assim, use o comando de novo com **substituir: sim** (o pet antigo é perdido).`,
        flags: EPH,
        allowedMentions: { parse: [] },
      });
    }

    P.guardar(interaction.user.id, {
      alvoId: alvo.id,
      nome: (interaction.options.getString('nome') || 'Dragonfox').trim() || 'Dragonfox',
      canalId: interaction.channelId,
    });

    const modal = new ModalBuilder()
      .setCustomId('petpresente:modal')
      .setTitle('Mensagem do presente')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('mensagem')
            .setLabel('Texto (use {membro} para marcar a pessoa)')
            .setStyle(TextInputStyle.Paragraph)
            .setMaxLength(2000)
            .setRequired(true)
            .setValue(P.MENSAGEM_PADRAO)
        )
      );
    return interaction.showModal(modal);
  },
};
