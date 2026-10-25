const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../db');

const EPH = MessageFlags.Ephemeral;

function paraMs(txt) {
  const m = /^(\d+)\s*(s|m|h|d)$/i.exec(txt.trim());
  if (!m) return null;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  return parseInt(m[1], 10) * mult;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lembrete')
    .setDescription('Lembretes')
    .addSubcommand((s) => s.setName('criar').setDescription('Cria um lembrete')
      .addStringOption((o) => o.setName('tempo').setDescription('Ex: 30s, 10m, 2h, 1d').setRequired(true))
      .addStringOption((o) => o.setName('texto').setDescription('Do que lembrar').setRequired(true).setMaxLength(300)))
    .addSubcommand((s) => s.setName('listar').setDescription('Lista seus lembretes')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const lista = db.get('lembretes', []);

    if (sub === 'criar') {
      const ms = paraMs(interaction.options.getString('tempo'));
      if (!ms || ms < 10000 || ms > 30 * 86400000) {
        return interaction.reply({ content: 'Tempo inválido. Use de 10s até 30d. Ex: `30s`, `10m`, `2h`, `1d`.', flags: EPH });
      }
      if (lista.filter((l) => l.userId === interaction.user.id).length >= 10) {
        return interaction.reply({ content: 'Você já tem 10 lembretes ativos.', flags: EPH });
      }
      const quando = Date.now() + ms;
      lista.push({
        id: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
        userId: interaction.user.id,
        canalId: interaction.channelId,
        quando,
        texto: interaction.options.getString('texto'),
      });
      db.set('lembretes', lista);
      return interaction.reply({ content: `⏰ Combinado! Eu te lembro <t:${Math.floor(quando / 1000)}:R>.`, flags: EPH });
    }

    if (sub === 'listar') {
      const meus = lista.filter((l) => l.userId === interaction.user.id);
      if (!meus.length) return interaction.reply({ content: 'Você não tem lembretes.', flags: EPH });
      const txt = meus.map((l) => `⏰ <t:${Math.floor(l.quando / 1000)}:R> — ${l.texto}`).join('\n');
      return interaction.reply({ content: txt, flags: EPH });
    }
  },
};
