const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const B = require('../extras/bichos');

const COR = 0xf5a3c7;

const FRASES = [
  'apareceu do nada e quer carinho!',
  'veio ver como você está. 💕',
  'trouxe um pouquinho de fofura para o seu dia.',
  'está pulando de felicidade por te ver!',
  'piscou para você. ✨',
  'passou por aqui só para dar oi!',
  'achou você e não quer mais ir embora.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bichinho')
    .setDescription('Mostra um bichinho fofo animado em pixel art (aleatório se você não escolher)')
    .addStringOption((o) =>
      o
        .setName('especie')
        .setDescription('Qual bichinho (vazio = surpresa)')
        .addChoices(...B.chaves.map((c) => ({ name: B.BICHOS[c].nome, value: c })))
    ),

  async execute(interaction) {
    const b = B.sortear(interaction.options.getString('especie'));
    const frase = FRASES[Math.floor(Math.random() * FRASES.length)];
    const embed = new EmbedBuilder()
      .setColor(COR)
      .setTitle(`${b.emoji} ${b.nome} fofinho`)
      .setDescription(`Um **${b.nome.toLowerCase()}** ${frase}`)
      .setImage(b.url);
    return interaction.reply({ embeds: [embed], files: [b.anexo()] });
  },
};
