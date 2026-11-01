const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../db');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const mostrar = (id) => (id ? `<@&${id}>` : 'não definido');

function definir(interaction, chave, nome) {
  const cargo = interaction.options.getRole('cargo');
  if (!cargo) {
    db.remover(`config.recepcao.cargos.${chave}`);
    return responder(interaction, `✅ Cargo de ${nome} removido.`);
  }
  if (cargo.managed || cargo.id === interaction.guild.id) {
    return responder(interaction, '❌ Esse cargo não pode ser usado.');
  }
  db.set(`config.recepcao.cargos.${chave}`, cargo.id);
  return responder(interaction, `✅ Cargo de ${nome} definido: ${cargo}`);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaorep')
    .setDescription('Cargos de rep que pulam a recepção e a inatividade (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra os cargos de rep'))
    .addSubcommand((s) =>
      s
        .setName('parceria')
        .setDescription('Define o cargo de rep de parceria (vazio = remover)')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo'))
    )
    .addSubcommand((s) =>
      s
        .setName('alianca')
        .setDescription('Define o cargo de rep de aliança (vazio = remover)')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'parceria') return definir(interaction, 'repParceria', 'rep de parceria');
    if (sub === 'alianca') return definir(interaction, 'repAlianca', 'rep de aliança');

    const c = (k) => db.get(`config.recepcao.cargos.${k}`, null);
    return responder(
      interaction,
      `**Rep de parceria:** ${mostrar(c('repParceria'))}\n` +
        `**Rep de aliança:** ${mostrar(c('repAlianca'))}\n` +
        `**Sem vaga:** ${mostrar(c('semVaga'))}\n` +
        `**Verificado:** ${mostrar(c('verificado'))}\n\n` +
        'Só rep (sem o cargo de sem vaga) pula a recepção e a inatividade.'
    );
  },
};
