const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const R = require('../rpg/nucleo');
const P = require('../personagem/nucleo');
const A = require('../personagem/arte');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('personagem')
    .setDescription('Seu personagem em pixel art (dark fantasy)')
    .addSubcommand((s) => s.setName('editar').setDescription('Monte o visual do seu personagem'))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o personagem de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'editar') {
      if (!P.tem(uid)) P.salvar(uid, A.PADRAO); // começa com o viajante padrão
      return interaction.reply({ ...P.painel(uid, 'cabelo'), flags: EPH });
    }

    const alvo = interaction.options.getUser('membro') || interaction.user;
    if (!P.tem(alvo.id)) {
      return interaction.reply({ content: alvo.id === uid ? 'Você ainda não montou seu personagem. Use `/personagem editar`! 🎨' : 'Essa pessoa ainda não montou o personagem.', flags: EPH });
    }
    const j = R.obter(alvo.id);
    const nome = (j && j.personagem) || alvo.username;
    const embed = new EmbedBuilder().setColor(P.COR).setTitle(`🗡️ ${nome}`).setImage(`attachment://${P.ARQUIVO}`);
    if (j) embed.setDescription(`Nível **${j.nivel}** · ${j.vitorias} vitórias\nPerfil completo: \`/rpg perfil\``);
    return interaction.reply({ embeds: [embed], files: P.arquivos(alvo.id) });
  },
};
// fim do arquivo
