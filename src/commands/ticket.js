const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const N = require('../ticket/nucleo');
const F = require('../ticket/fluxo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ações dentro de um ticket')
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Adiciona um membro ao ticket (só a staff)')
        .addUserOption((o) => o.setName('membro').setDescription('Quem adicionar').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove um membro do ticket (só a staff)')
        .addUserOption((o) => o.setName('membro').setDescription('Quem remover').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('renomear')
        .setDescription('Renomeia o canal do ticket (só a staff)')
        .addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(50))
    )
    .addSubcommand((s) =>
      s
        .setName('fechar')
        .setDescription('Fecha este ticket')
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo (opcional)').setMaxLength(300))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;

    const t = N.ticketDoCanal(interaction.channelId);
    if (!t) return responder(interaction, '❌ Use este comando dentro de um ticket aberto.');

    const sub = interaction.options.getSubcommand();

    if (sub === 'fechar') {
      if (!N.ehStaff(interaction.member, t) && interaction.user.id !== t.userId) {
        return responder(interaction, '❌ Só quem abriu o ticket ou a staff pode fechar.');
      }
      const motivo = interaction.options.getString('motivo') || '';
      await interaction.reply('🔒 Fechando o ticket e gerando a transcrição...');
      return F.encerrar(interaction.guild, interaction.channel, interaction.user, motivo);
    }

    if (!N.ehStaff(interaction.member, t)) return responder(interaction, '❌ Só a staff pode usar este comando.');

    if (sub === 'adicionar') return F.adicionar(interaction, interaction.options.getUser('membro'));
    if (sub === 'remover') return F.remover(interaction, interaction.options.getUser('membro'));
    if (sub === 'renomear') return F.renomear(interaction, interaction.options.getString('nome'));
  },
};
