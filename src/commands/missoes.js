const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const N = require('../missoes/nucleo');

const EPH = MessageFlags.Ephemeral;

function textoResgate(r) {
  let t = `🎉 Missões resgatadas: **${r.feitos.join(', ')}**\n⭐ +${r.stars} stars · ✨ +${r.xp} XP`;
  if (r.subiu) t += `\n🎊 **Subiu para o nível ${r.nivel}!**`;
  if (r.novas && r.novas.length) t += `\n🏅 Novas conquistas: ${r.novas.map((c) => `${c.emoji} ${c.nome}`).join(', ')}`;
  return t;
}

module.exports = {
  textoResgate,
  data: new SlashCommandBuilder()
    .setName('missoes')
    .setDescription('Missões diárias, semanais e conquistas')
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra suas missões de hoje e da semana'))
    .addSubcommand((s) => s.setName('resgatar').setDescription('Resgata as recompensas das missões prontas'))
    .addSubcommand((s) => s.setName('conquistas').setDescription('Mostra as conquistas')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'conquistas') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      return interaction.reply({ embeds: [N.embedConquistas(alvo.id, alvo.username)] });
    }

    if (!N.temRpg(uid)) {
      return interaction.reply({ content: '❌ As missões usam o RPG da house. Crie seu personagem com `/rpg criar` primeiro!', flags: EPH });
    }

    if (sub === 'ver') {
      return interaction.reply({ embeds: [N.embedMissoes(uid)], components: [N.botoesMissoes(uid)], flags: EPH });
    }

    if (sub === 'resgatar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.resgatar(interaction.client, uid);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply(textoResgate(r));
    }
  },
};
