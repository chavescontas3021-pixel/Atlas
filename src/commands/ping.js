const { SlashCommandBuilder } = require('discord.js');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

// 24h → "2d 3h 10min"
function duracao(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}min`].filter(Boolean).join(' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra se o Atlas está bem'),

  async execute(interaction, client) {
    const inicio = Date.now();
    await interaction.deferReply({ flags: UI.EPH });
    const resposta = Date.now() - inicio;
    const ws = client.ws.ping;

    const embed = UI.painel({
      trilha: ['Status'],
      titulo: 'Tudo certo por aqui',
      campos: [
        { nome: 'Conexão', valor: ws >= 0 ? `${ws} ms` : '—', lado: true },
        { nome: 'Resposta', valor: `${resposta} ms`, lado: true },
        { nome: 'Ligado há', valor: duracao(client.uptime || 0), lado: true },
      ],
      rodape: `${client.guilds.cache.size} ${client.guilds.cache.size === 1 ? 'servidor' : 'servidores'}  ${S.sep}  ${Math.round(process.memoryUsage().rss / 1048576)} MB`,
    });
    return interaction.editReply({ embeds: [embed] });
  },
};
