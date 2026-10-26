const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const A = require('../recepcao/aprovacao');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });
const K = (k) => `config.recepcao.aprovacao.${k}`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaoaprovar')
    .setDescription('Recepção com autorização da staff e boas-vindas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga a autorização pela staff')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Sim = a staff autoriza; Não = o bot verifica sozinho').setRequired(true)))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal da staff que recebe os pedidos')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal da staff').setRequired(true).addChannelTypes(...TEXTO)))
    .addSubcommand((s) => s.setName('boasvindas').setDescription('Onde e quem chamar para dar boas-vindas')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal das boas-vindas (vazio = desliga)').addChannelTypes(...TEXTO))
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo "membro novo" que será marcado (opcional)')))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Texto das boas-vindas')
      .addStringOption((o) => o.setName('texto').setDescription('Use {membro} {nick} {personagem} {cargo} {servidor} {staff} (vazio = padrão)').setMaxLength(1500))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const c = (k) => db.get(K(k));
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('📨 Autorização da recepção').addFields(
        { name: 'Estado', value: c('ativo') ? '🟢 Ligada' : '🔴 Desligada (o bot verifica sozinho)', inline: true },
        { name: 'Canal da staff', value: c('canal') ? `<#${c('canal')}>` : 'não definido', inline: true },
        { name: 'Canal das boas-vindas', value: c('canalBoasVindas') ? `<#${c('canalBoasVindas')}>` : 'não definido', inline: true },
        { name: 'Cargo marcado', value: c('cargoPing') ? `<@&${c('cargoPing')}>` : 'nenhum', inline: true },
        { name: 'Texto', value: (c('mensagem') || A.MSG_PADRAO).slice(0, 900) },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ativar') {
      const v = interaction.options.getBoolean('ligado');
      if (v && !db.get(K('canal'))) return responder(interaction, '⚠️ Primeiro defina o canal da staff com `/recepcaoaprovar canal`.');
      db.set(K('ativo'), v);
      return responder(interaction, v ? '✅ Agora a staff autoriza cada verificação.' : '⏸️ Desligado: o bot volta a verificar sozinho.');
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set(K('canal'), canal.id);
      return responder(interaction, `✅ Os pedidos de verificação vão para ${canal}.`);
    }

    if (sub === 'boasvindas') {
      const canal = interaction.options.getChannel('canal');
      const cargo = interaction.options.getRole('cargo');
      if (!canal) {
        db.remover(K('canalBoasVindas'));
        db.remover(K('cargoPing'));
        return responder(interaction, '✅ Boas-vindas desligadas.');
      }
      db.set(K('canalBoasVindas'), canal.id);
      if (cargo) db.set(K('cargoPing'), cargo.id); else db.remover(K('cargoPing'));
      return responder(interaction, `✅ Quando a staff autorizar, eu chamo em ${canal}${cargo ? ` marcando ${cargo}` : ''}.`);
    }

    if (sub === 'mensagem') {
      const t = interaction.options.getString('texto');
      if (!t) {
        db.remover(K('mensagem'));
        return responder(interaction, '✅ Voltou ao texto padrão.');
      }
      db.set(K('mensagem'), t);
      return responder(interaction, '✅ Texto salvo.');
    }
  },
};
