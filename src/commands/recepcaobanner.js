const {
  EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');

const EPH = MessageFlags.Ephemeral;
const CAMINHO = 'config.recepcao.mensagens.boasVindas.banner';
const responder = (i, content) => i.reply({ content, flags: EPH });

function urlValida(texto) {
  try {
    const u = new URL(String(texto).trim());
    return ['http:', 'https:'].includes(u.protocol) && texto.length <= 500 ? u.href : null;
  } catch {
    return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaobanner')
    .setDescription('Banner (imagem grande) da mensagem de boas-vindas da recepção')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('definir')
        .setDescription('Coloca um banner na mensagem de boas-vindas')
        .addStringOption((o) =>
          o.setName('link').setDescription('Link direto da imagem (https://...)').setRequired(true).setMaxLength(500)
        )
    )
    .addSubcommand((s) => s.setName('remover').setDescription('Tira o banner'))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o banner atual')),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'definir') {
      const url = urlValida(interaction.options.getString('link'));
      if (!url) return responder(interaction, '❌ Link inválido. Use um link que comece com `https://` e leve direto à imagem.');
      db.set(CAMINHO, url);
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('Prévia do banner').setImage(url);
      return interaction.reply({
        content:
          '✅ Banner salvo! Se a prévia abaixo não aparecer, o link não é de uma imagem direta.\n' +
          '⚠️ Links de anexos do Discord expiram depois de um tempo. Prefira hospedar a imagem em outro lugar (ex.: Imgur).',
        embeds: [embed],
        flags: EPH,
      });
    }

    if (sub === 'remover') {
      db.remover(CAMINHO);
      return responder(interaction, '🗑️ Banner removido.');
    }

    const url = db.get(CAMINHO);
    if (!url) return responder(interaction, 'Nenhum banner definido. Use `/recepcaobanner definir`.');
    const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('Banner atual').setImage(url);
    return interaction.reply({ content: url, embeds: [embed], flags: EPH });
  },
};
