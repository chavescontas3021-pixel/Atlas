// Botões dos alertas da blacklist: Advertir e Castigar 1h (só administradores).
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const N = require('../moderacao/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('blacklist:')) return;
      const [, acao, userId] = interaction.customId.split(':');
      if (!interaction.inGuild()) return;

      const ehAdm =
        interaction.memberPermissions.has(PermissionFlagsBits.Administrator) ||
        interaction.user.id === interaction.guild.ownerId;
      if (!ehAdm) return interaction.reply({ content: '❌ Só administradores podem usar esses botões.', flags: EPH });

      const membro = await interaction.guild.members.fetch(userId).catch(() => null);
      if (!membro) return interaction.reply({ content: 'ℹ️ Esse membro não está mais no servidor.', flags: EPH });

      if (acao === 'adv') {
        const r = await N.darAviso(interaction.guild, interaction.user, membro, 'Blacklist: atividade suspeita', null);
        const extra = r.total >= r.limite ? (r.banido && r.banido.ok ? ' Ele atingiu o limite e foi banido.' : ' Ele atingiu o limite, mas não consegui banir.') : '';
        return interaction.reply({ content: `⚠️ ${membro} recebeu uma advertência (**${r.total}/${r.limite}**).${extra}`, flags: EPH, allowedMentions: { parse: [] } });
      }

      if (acao === 'cast') {
        if (!membro.moderatable) {
          return interaction.reply({ content: '❌ Não consigo castigar esse membro (o cargo dele está acima do meu).', flags: EPH });
        }
        await membro.timeout(60 * 60 * 1000, `Blacklist: atividade suspeita (por ${interaction.user.tag})`);
        return interaction.reply({ content: `🔇 ${membro} ficou de castigo por 1 hora.`, flags: EPH, allowedMentions: { parse: [] } });
      }
    } catch (e) {
      console.error('[Blacklist] botões:', e);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'Deu erro ao executar essa ação.', flags: EPH }).catch(() => {});
      }
    }
  },
};
