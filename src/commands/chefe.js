const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../chefe/nucleo');

const EPH = MessageFlags.Ephemeral;

function textoAtaque(r) {
  let t = `⚔️ Você causou **${N.fmt(r.dano)}** de dano${r.crit ? ' (**CRÍTICO!**)' : ''}!\n❤️ Vida do chefe: ${N.fmt(r.hp)}/${N.fmt(r.hpMax)}`;
  if (r.derrotou) t += '\n🏆 **Você deu o golpe final!**';
  return t;
}

module.exports = {
  textoAtaque,
  data: new SlashCommandBuilder()
    .setName('chefe')
    .setDescription('Eventos de chefe')
    .addSubcommand((s) => s.setName('status').setDescription('Mostra o chefe atual'))
    .addSubcommand((s) => s.setName('atacar').setDescription('Ataca o chefe')
      .addBooleanOption((o) => o.setName('forte').setDescription('Golpe forte (recarga de 5 min)')))
    .addSubcommand((s) => s.setName('placar').setDescription('Ranking de dano do chefe atual'))
    .addSubcommand((s) => s.setName('historico').setDescription('Últimos chefes')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const a = N.ativo();

    if (sub === 'historico') {
      const h = (db.get('chefe.historico', []) || []).slice(-5).reverse();
      if (!h.length) return interaction.reply({ content: 'Ainda não houve nenhum chefe.', flags: EPH });
      const txt = h.map((x) => `${x.emoji} **${x.nome}** — ${x.resultado === 'vitoria' ? '🏆 derrotado' : '💨 escapou'} · ${x.lutadores} lutador(es)${x.mvp ? ` · MVP <@${x.mvp}>` : ''} · <t:${Math.floor(x.quando / 1000)}:d>`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle('📜 Últimos chefes').setDescription(txt)], allowedMentions: { parse: [] } });
    }

    if (!a) return interaction.reply({ content: 'Não há nenhum chefe agora. Fique de olho nos avisos! 👀', flags: EPH });

    if (sub === 'status') return interaction.reply({ embeds: [N.embedChefe(a)], allowedMentions: { parse: [] } });

    if (sub === 'placar') {
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle(`📊 Dano em ${a.nome}`).setDescription(N.textoPlacar(a))], flags: EPH, allowedMentions: { parse: [] } });
    }

    if (sub === 'atacar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.atacar(interaction.client, interaction.user.id, !!interaction.options.getBoolean('forte'));
      return interaction.editReply(r.erro ? `❌ ${r.erro}` : textoAtaque(r));
    }
  },
};
