const {
  ChannelType, SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const db = require('../db');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const mostrar = (id) => (id ? `<@&${id}>` : 'não definido');
const mostrarCanal = (id) => (id ? `<#${id}>` : 'não definido');

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

function definirCanais(interaction) {
  const parceria = interaction.options.getChannel('parceria');
  const alianca = interaction.options.getChannel('alianca');
  if (!parceria && !alianca) {
    db.remover('config.recepcao.rep.canalParceria');
    db.remover('config.recepcao.rep.canalAlianca');
    return responder(interaction, '✅ Canais removidos. Sem canais, o botão "Sou apenas representante" some.');
  }
  if (parceria) db.set('config.recepcao.rep.canalParceria', parceria.id);
  if (alianca) db.set('config.recepcao.rep.canalAlianca', alianca.id);
  return responder(interaction, '✅ Canais salvos. Confira com `/recepcaorep status`.');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaorep')
    .setDescription('Representantes: cargos de rep e canais mostrados a quem é apenas representante (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração de representantes'))
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
    )
    .addSubcommand((s) =>
      s
        .setName('canais')
        .setDescription('Canais mostrados a quem aperta "Sou apenas representante" (vazio = remover os dois)')
        .addChannelOption((o) => o.setName('parceria').setDescription('Canal de parceria').addChannelTypes(...TEXTO))
        .addChannelOption((o) => o.setName('alianca').setDescription('Canal de aliança').addChannelTypes(...TEXTO))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'parceria') return definir(interaction, 'repParceria', 'rep de parceria');
    if (sub === 'alianca') return definir(interaction, 'repAlianca', 'rep de aliança');
    if (sub === 'canais') return definirCanais(interaction);

    const c = (k) => db.get(`config.recepcao.cargos.${k}`, null);
    const r = (k) => db.get(`config.recepcao.rep.${k}`, null);
    return responder(
      interaction,
      `**Rep de parceria:** ${mostrar(c('repParceria'))}\n` +
        `**Rep de aliança:** ${mostrar(c('repAlianca'))}\n` +
        `**Sem vaga:** ${mostrar(c('semVaga'))}\n` +
        `**Verificado:** ${mostrar(c('verificado'))}\n\n` +
        `**Canal de parceria (botão "apenas representante"):** ${mostrarCanal(r('canalParceria'))}\n` +
        `**Canal de aliança (botão "apenas representante"):** ${mostrarCanal(r('canalAlianca'))}\n\n` +
        'Só rep (sem o cargo de sem vaga) pula a recepção e a inatividade.'
    );
  },
};
