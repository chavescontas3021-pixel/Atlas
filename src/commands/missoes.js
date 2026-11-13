const { SlashCommandBuilder } = require('discord.js');
const N = require('../missoes/nucleo');
const UI = require('../ui/componentes');
const T = require('../ui/tema');

function textoResgate(r) {
  let t = `Missões resgatadas: **${r.feitos.join(', ')}**\n${T.S.filho} ⭐ +${r.stars} stars  ${T.S.sep}  +${r.xp} XP`;
  if (r.subiu) t += `\n${T.S.seta} **Subiu para o nível ${r.nivel}.**`;
  if (r.novas && r.novas.length) t += `\n${T.S.seta} Novas conquistas: ${r.novas.map((c) => c.nome).join(', ')}`;
  return t;
}

const RpgCanal = require('../rpg/canal');

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
    const bloqueado = RpgCanal.bloqueio(interaction);
    if (bloqueado) return interaction.reply(UI.erro(T.tirarEmoji(bloqueado)));
    const uid = interaction.user.id;

    if (sub === 'conquistas') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      return interaction.reply({ embeds: [N.embedConquistas(alvo.id, alvo.username)] });
    }

    if (!N.temRpg(uid)) {
      return interaction.reply(UI.erro('As missões usam o RPG da house. Crie seu personagem com `/rpg criar` primeiro.'));
    }

    if (sub === 'ver') {
      return interaction.reply({ embeds: [N.embedMissoes(uid)], components: [N.botoesMissoes(uid)], flags: UI.EPH });
    }

    if (sub === 'resgatar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.resgatar(interaction.client, uid);
      if (r.erro) return interaction.editReply(UI.edicao(UI.erro(r.erro)));
      return interaction.editReply(UI.edicao(UI.ok(textoResgate(r))));
    }
  },
};
