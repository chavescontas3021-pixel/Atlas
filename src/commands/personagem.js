const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const R = require('../rpg/nucleo');
const P = require('../personagem/nucleo');
const A = require('../personagem/arte');

const { PermissionFlagsBits } = require('discord.js');
const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('personagem')
    .setDescription('Seu personagem em pixel art (dark fantasy)')
    .addSubcommand((s) => s.setName('editar').setDescription('Monte o visual do seu personagem'))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o personagem de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)')))
    .addSubcommand((s) => s.setName('especial').setDescription('Staff: libera ou retira um personagem único de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('Quem recebe').setRequired(true))
      .addStringOption((o) => o.setName('tipo').setDescription('Qual personagem').setRequired(true)
        .addChoices(...Object.entries(P.ESPECIAIS).map(([id, e]) => ({ name: `${e.emoji} ${e.nome}`, value: id }))))
      .addBooleanOption((o) => o.setName('liberar').setDescription('Sim = libera (padrão) · Não = retira'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'especial') {
      if (!interaction.inGuild() || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'Só a staff (Gerenciar Servidor) pode usar isso.', flags: EPH });
      }
      const alvo = interaction.options.getUser('membro');
      const id = interaction.options.getString('tipo');
      const liberar = interaction.options.getBoolean('liberar') !== false;
      const e = P.ESPECIAIS[id];
      if (liberar) {
        P.liberar(alvo.id, id);
        return interaction.reply({ content: `${e.emoji} **${e.nome}** liberado para ${alvo}! Ele liga em \`/personagem editar\`.`, allowedMentions: { parse: [] } });
      }
      P.retirar(alvo.id, id);
      return interaction.reply({ content: `${e.emoji} **${e.nome}** retirado de ${alvo}.`, allowedMentions: { parse: [] } });
    }

    if (sub === 'editar') {
      if (!P.tem(uid)) P.salvar(uid, A.PADRAO); // começa com o viajante padrão
      return interaction.reply({ ...P.painel(uid, 'cabelo'), allowedMentions: { parse: [] } }); // mensagem normal (não efêmera): não some sozinha
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
