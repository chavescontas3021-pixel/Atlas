const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { alterarCargos } = require('../utils/cargos');

const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cargo')
    .setDescription('Dá ou tira cargos de membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Dá um cargo a um membro')
        .addUserOption((o) => o.setName('membro').setDescription('Quem vai receber').setRequired(true))
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Tira um cargo de um membro')
        .addUserOption((o) => o.setName('membro').setDescription('De quem tirar').setRequired(true))
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('prefixo')
        .setDescription('Muda o prefixo dos comandos de texto (padrão: !)')
        .addStringOption((o) =>
          o.setName('texto').setDescription('Novo prefixo (até 3 caracteres)').setRequired(true).setMaxLength(3)
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'prefixo') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ Você precisa da permissão **Gerenciar servidor**.', flags: MessageFlags.Ephemeral });
      }
      const texto = interaction.options.getString('texto').trim();
      if (!texto) return interaction.reply({ content: '❌ Prefixo inválido.', flags: MessageFlags.Ephemeral });
      db.set('config.prefixo', texto);
      return interaction.reply({ content: `✅ Prefixo mudado para \`${texto}\``, flags: MessageFlags.Ephemeral });
    }

    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: '❌ Você precisa da permissão **Gerenciar cargos**.', flags: MessageFlags.Ephemeral });
    }

    const alvo = interaction.options.getMember('membro');
    const cargo = interaction.options.getRole('cargo');
    if (!alvo) {
      return interaction.reply({ content: '❌ Esse membro não está no servidor.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ allowedMentions: SEM_PING });
    const resultado = await alterarCargos(interaction.member, alvo, [cargo], sub);
    await interaction.editReply({ content: resultado, allowedMentions: SEM_PING });
  },
};
