const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra a latência do Atlas'),

  async execute(interaction, client) {
    await interaction.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
  },
};
