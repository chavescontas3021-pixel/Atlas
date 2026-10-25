const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../ficha/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fichaconfig')
    .setDescription('Configura as fichas de personagem (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal onde as fichas são publicadas')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('limite').setDescription('Quantas fichas cada pessoa pode ter')
      .addIntegerOption((o) => o.setName('quantidade').setDescription('1 a 10').setRequired(true).setMinValue(1).setMaxValue(10))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const canal = N.cfg('canal');
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle('📖 Fichas do Atlas')
        .addFields(
          { name: 'Canal das fichas', value: canal ? `<#${canal}>` : 'não definido' },
          { name: 'Limite por pessoa', value: `${N.limite()}` },
          { name: 'Fichas criadas', value: `${N.todas().length}` },
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.ficha.canal', canal.id);
      return responder(interaction, `✅ As fichas serão publicadas em ${canal}. (Fichas já existentes continuam onde estão; ao editar, se a mensagem sumiu, ela é recriada aqui.)`);
    }

    if (sub === 'limite') {
      const n = interaction.options.getInteger('quantidade');
      db.set('config.ficha.limite', n);
      return responder(interaction, `✅ Cada pessoa pode ter até **${n}** ficha(s).`);
    }
  },
};
