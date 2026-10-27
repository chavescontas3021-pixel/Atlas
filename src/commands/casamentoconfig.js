const { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../casamento/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: { parse: [] } });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casamentoconfig')
    .setDescription('Configura os casamentos (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) =>
      s
        .setName('categoria')
        .setDescription('Categoria onde os canais de casamento são criados (vazio = remover)')
        .addChannelOption((o) => o.setName('categoria').setDescription('A categoria').addChannelTypes(ChannelType.GuildCategory))
    )
    .addSubcommand((s) =>
      s
        .setName('staff')
        .setDescription('Cargo da staff que acompanha os casamentos (vazio = remover)')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo'))
    )
    .addSubcommand((s) =>
      s
        .setName('cargo')
        .setDescription('Cargo dado aos dois quando casam (vazio = remover)')
        .addRoleOption((o) => o.setName('cargo').setDescription('O cargo'))
    )
    .addSubcommand((s) =>
      s
        .setName('anuncio')
        .setDescription('Canal onde o bot avisa que um casal se casou (vazio = remover)')
        .addChannelOption((o) => o.setName('canal').setDescription('O canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((s) =>
      s
        .setName('limite')
        .setDescription('Quantos convidados cada casamento pode ter')
        .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade').setRequired(true).setMinValue(1).setMaxValue(200))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const m = (id, tipo) => (id ? (tipo === 'cargo' ? `<@&${id}>` : `<#${id}>`) : 'não definido');
      return responder(
        interaction,
        `💒 **Casamentos**\nCategoria dos canais: ${m(N.cfg('categoria'))}\nCargo da staff: ${m(N.cfg('staff'), 'cargo')}\nCargo de casados: ${m(N.cfg('cargo'), 'cargo')}\nCanal de anúncios: ${m(N.cfg('anuncio'))}\nLimite de convidados: **${N.limiteConvidados()}**`
      );
    }

    const guardar = (chave, valor, okTxt, vazioTxt) => {
      if (!valor) {
        db.remover(`config.casamento.${chave}`);
        return responder(interaction, vazioTxt);
      }
      db.set(`config.casamento.${chave}`, valor.id !== undefined ? valor.id : valor);
      return responder(interaction, okTxt(valor));
    };

    if (sub === 'categoria') return guardar('categoria', interaction.options.getChannel('categoria'), (v) => `✅ Os canais de casamento serão criados em ${v}.`, '✅ Categoria removida.');
    if (sub === 'staff') return guardar('staff', interaction.options.getRole('cargo'), (v) => `✅ ${v} acompanha os casamentos.`, '✅ Cargo da staff removido.');
    if (sub === 'cargo') return guardar('cargo', interaction.options.getRole('cargo'), (v) => `✅ Quem casar recebe o cargo ${v}.`, '✅ Cargo de casados removido.');
    if (sub === 'anuncio') return guardar('anuncio', interaction.options.getChannel('canal'), (v) => `✅ Os casamentos serão anunciados em ${v}.`, '✅ Canal de anúncios removido.');
    if (sub === 'limite') {
      const n = interaction.options.getInteger('quantidade');
      db.set('config.casamento.limite', n);
      return responder(interaction, `✅ Cada casamento pode ter até **${n}** convidados.`);
    }
  },
};
