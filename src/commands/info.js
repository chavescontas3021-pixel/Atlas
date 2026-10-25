const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const COR = 0xf5a3c7;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Informações sobre membros e o servidor')
    .addSubcommand((s) => s.setName('avatar').setDescription('Mostra o avatar de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('Membro')))
    .addSubcommand((s) => s.setName('banner').setDescription('Mostra o banner de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('Membro')))
    .addSubcommand((s) => s.setName('usuario').setDescription('Informações de um membro')
      .addUserOption((o) => o.setName('membro').setDescription('Membro')))
    .addSubcommand((s) => s.setName('servidor').setDescription('Informações do servidor')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'avatar') {
      const user = interaction.options.getUser('membro') || interaction.user;
      const url = user.displayAvatarURL({ size: 1024 });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COR).setTitle(`Avatar de ${user.username}`).setImage(url).setDescription(`[Abrir original](${url})`)],
      });
    }

    if (sub === 'banner') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const user = await alvo.fetch(true);
      const url = user.bannerURL({ size: 1024 });
      if (!url) return interaction.reply({ content: 'Essa pessoa não tem banner.', flags: MessageFlags.Ephemeral });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COR).setTitle(`Banner de ${user.username}`).setImage(url)],
      });
    }

    if (sub === 'usuario') {
      const user = interaction.options.getUser('membro') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const emb = new EmbedBuilder()
        .setColor(COR)
        .setTitle(user.username)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '📅 Conta criada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        );
      if (member) {
        const cargos = member.roles.cache
          .filter((r) => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString());
        emb.addFields(
          { name: '📥 Entrou no servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
          { name: `🎭 Cargos (${cargos.length})`, value: cargos.slice(0, 15).join(' ') || 'Nenhum', inline: false },
        );
      }
      return interaction.reply({ embeds: [emb] });
    }

    if (sub === 'servidor') {
      const g = interaction.guild;
      const dono = await g.fetchOwner().catch(() => null);
      const emb = new EmbedBuilder()
        .setColor(COR)
        .setTitle(g.name)
        .setThumbnail(g.iconURL({ size: 256 }))
        .addFields(
          { name: '👑 Dono', value: dono ? `<@${dono.id}>` : '—', inline: true },
          { name: '👥 Membros', value: `${g.memberCount}`, inline: true },
          { name: '💬 Canais', value: `${g.channels.cache.size}`, inline: true },
          { name: '🎭 Cargos', value: `${g.roles.cache.size}`, inline: true },
          { name: '💎 Boosts', value: `${g.premiumSubscriptionCount || 0}`, inline: true },
          { name: '📅 Criado', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        );
      return interaction.reply({ embeds: [emb] });
    }
  },
};
