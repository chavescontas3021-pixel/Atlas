const { SlashCommandBuilder } = require('discord.js');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');

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
      const png = user.displayAvatarURL({ size: 1024, extension: 'png' });
      const webp = user.displayAvatarURL({ size: 1024, extension: 'webp' });
      const embed = UI.painel({ trilha: ['Info', 'Avatar'], titulo: user.username, imagem: png });
      return interaction.reply({
        embeds: [embed],
        components: [UI.linha(
          UI.botao({ label: 'PNG', url: png }),
          UI.botao({ label: 'WEBP', url: webp }),
        )],
      });
    }

    if (sub === 'banner') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const user = await alvo.fetch(true);
      const url = user.bannerURL({ size: 1024 });
      if (!url) return interaction.reply(UI.erro(`**${user.username}** não tem banner.`));
      return interaction.reply({
        embeds: [UI.painel({ trilha: ['Info', 'Banner'], titulo: user.username, imagem: url })],
        components: [UI.linha(UI.botao({ label: 'Abrir original', url }))],
      });
    }

    if (sub === 'usuario') {
      const user = interaction.options.getUser('membro') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const campos = [
        { nome: 'ID', valor: `\`${user.id}\``, lado: true },
        { nome: 'Conta criada', valor: quando(user.createdTimestamp), lado: true },
      ];
      if (member) {
        const cargos = member.roles.cache
          .filter((r) => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString());
        campos.push({ nome: 'Entrou no servidor', valor: quando(member.joinedTimestamp), lado: true });
        campos.push({
          nome: `Cargos  ${S.sep}  ${cargos.length}`,
          valor: cargos.slice(0, 15).join(' ') || 'Nenhum',
        });
      }
      const embed = UI.painel({
        trilha: ['Info', 'Membro'],
        titulo: member?.displayName || user.username,
        descricao: `@${user.username}${user.bot ? `  ${S.sep}  bot` : ''}`,
        thumb: user.displayAvatarURL({ size: 256 }),
        campos,
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'servidor') {
      const g = interaction.guild;
      const dono = await g.fetchOwner().catch(() => null);
      const embed = UI.painel({
        trilha: ['Info', 'Servidor'],
        titulo: g.name,
        descricao: g.description || undefined,
        thumb: g.iconURL({ size: 256 }),
        campos: [
          { nome: 'Dono', valor: dono ? `<@${dono.id}>` : '—', lado: true },
          { nome: 'Membros', valor: `${g.memberCount}`, lado: true },
          { nome: 'Canais', valor: `${g.channels.cache.size}`, lado: true },
          { nome: 'Cargos', valor: `${g.roles.cache.size}`, lado: true },
          { nome: 'Boosts', valor: `${g.premiumSubscriptionCount || 0}`, lado: true },
          { nome: 'Criado', valor: quando(g.createdTimestamp), lado: true },
        ],
      });
      return interaction.reply({ embeds: [embed] });
    }
  },
};
