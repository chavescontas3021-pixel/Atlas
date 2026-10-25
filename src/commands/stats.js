const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const N = require('../stats/nucleo');

const COR = 0xf5a3c7;
const fmt = (n) => Number(n).toLocaleString('pt-BR');
const diasOpt = (o) => o.setName('dias').setDescription('Período (padrão 7)').addChoices(
  { name: '7 dias', value: 7 }, { name: '14 dias', value: 14 }, { name: '30 dias', value: 30 },
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Estatísticas do servidor')
    .addSubcommand((s) => s.setName('servidor').setDescription('Resumo do servidor').addIntegerOption(diasOpt))
    .addSubcommand((s) => s.setName('top').setDescription('Membros e canais mais ativos').addIntegerOption(diasOpt))
    .addSubcommand((s) => s.setName('membro').setDescription('Atividade de um membro')
      .addUserOption((o) => o.setName('membro').setDescription('Quem (padrão: você)'))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const noMention = { parse: [] };

    if (sub === 'servidor') {
      const dias = interaction.options.getInteger('dias') || 7;
      const r = N.agregado(dias);
      const sete = N.agregado(7);
      const melhor = [...r.porDia].sort((a, b) => b.total - a.total)[0];
      const emb = new EmbedBuilder().setColor(COR).setTitle(`📊 ${guild.name} — últimos ${dias} dias`).addFields(
        { name: '👥 Membros agora', value: fmt(guild.memberCount), inline: true },
        { name: '📥 Entradas', value: fmt(r.entradas), inline: true },
        { name: '📤 Saídas', value: fmt(r.saidas), inline: true },
        { name: '💬 Mensagens', value: fmt(r.total), inline: true },
        { name: '📈 Média por dia', value: fmt(Math.round(r.total / dias)), inline: true },
        { name: '🔥 Dia mais movimentado', value: melhor && melhor.total ? `${fmt(melhor.total)} msgs em ${melhor.dia.slice(6, 8)}/${melhor.dia.slice(4, 6)}` : '—', inline: true },
      );
      const canais = N.top(r.canais, 3);
      if (canais.length) emb.addFields({ name: '🏆 Canais mais ativos', value: canais.map(([c, n], i) => `${i + 1}. <#${c}> — ${fmt(n)}`).join('\n') });
      emb.addFields({ name: '📅 Últimos 7 dias', value: '```\n' + N.grafico(sete.porDia) + '\n```' });
      emb.setFooter({ text: 'Mensagens contadas desde que o Atlas começou a registrar.' });
      return interaction.reply({ embeds: [emb], allowedMentions: noMention });
    }

    if (sub === 'top') {
      const dias = interaction.options.getInteger('dias') || 7;
      const r = N.agregado(dias);
      const membros = N.top(r.membros, 10);
      const canais = N.top(r.canais, 5);
      const medalha = ['🥇', '🥈', '🥉'];
      const emb = new EmbedBuilder().setColor(COR).setTitle(`🏆 Mais ativos — últimos ${dias} dias`);
      emb.addFields(
        { name: 'Membros', value: membros.length ? membros.map(([u, n], i) => `${medalha[i] || `${i + 1}.`} <@${u}> — ${fmt(n)}`).join('\n') : 'Sem dados ainda.' },
        { name: 'Canais', value: canais.length ? canais.map(([c, n], i) => `${i + 1}. <#${c}> — ${fmt(n)}`).join('\n') : 'Sem dados ainda.' },
      );
      return interaction.reply({ embeds: [emb], allowedMentions: noMention });
    }

    if (sub === 'membro') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const hoje = N.agregado(1).membros.get(alvo.id) || 0;
      const sete = N.agregado(7).membros.get(alvo.id) || 0;
      const r30 = N.agregado(30);
      const trinta = r30.membros.get(alvo.id) || 0;
      const ranking = [...r30.membros.entries()].sort((a, b) => b[1] - a[1]).findIndex(([u]) => u === alvo.id);
      const emb = new EmbedBuilder().setColor(COR).setTitle(`📊 Atividade de ${alvo.username}`).addFields(
        { name: 'Hoje', value: fmt(hoje), inline: true },
        { name: '7 dias', value: fmt(sete), inline: true },
        { name: '30 dias', value: fmt(trinta), inline: true },
        { name: 'Total registrado', value: fmt(N.totalDoMembro(alvo.id)), inline: true },
        { name: 'Posição (30 dias)', value: ranking >= 0 ? `#${ranking + 1}` : '—', inline: true },
      );
      return interaction.reply({ embeds: [emb], allowedMentions: noMention });
    }
  },
};
