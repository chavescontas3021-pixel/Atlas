const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const M = require('../modo/nucleo');

const EPH = MessageFlags.Ephemeral;
module.exports = {
  global: true,
  data: new SlashCommandBuilder().setName('modo').setDescription('Liga ou desliga o modo administrativo (só o dono)')
    .addSubcommand((s) => s.setName('administrativo').setDescription('Liga ou desliga todos os comandos de administração de servidor')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Verdadeiro = ligar, falso = desligar').setRequired(true)))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra como está')),
  async execute(interaction, client) {
    client = client || interaction.client;
    if (!(await M.ehDono(client, interaction.user.id))) return interaction.reply({ content: '🔒 Só o dono muda isso.', flags: EPH });
    if (interaction.options.getSubcommand() === 'administrativo') M.setAdmin(interaction.options.getBoolean('ligado'));
    const on = M.admin();
    return interaction.reply({
      flags: EPH,
      content: on
        ? '🛡️ **Modo administrativo: LIGADO.** Todos os comandos de administração estão ativos.'
        : '🛠️ **Modo administrativo: DESLIGADO.** Só funcionam o assistente de construção (`/decorar`, `/criar`, `/cargo`), `/forms`, `/modo` e os comandos pessoais.',
    });
  },
};
