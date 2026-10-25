const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const N = require('../inatividade/nucleo');
const V = require('../vagas/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inatividade')
    .setDescription('Justifique sua inatividade sem perder a vaga')
    .addSubcommand((s) => s.setName('justificar').setDescription('Avisa que vai ficar um tempo sem aparecer')
      .addStringOption((o) => o.setName('tempo').setDescription('Ex: 7 dias, 2 semanas, 1 mês').setRequired(true).setMaxLength(20))
      .addStringOption((o) => o.setName('motivo').setDescription('Por que vai ficar ausente').setRequired(true).setMaxLength(300)))
    .addSubcommand((s) => s.setName('voltar').setDescription('Encerra sua justificativa antes do prazo'))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra sua situação')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'justificar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.justificar(interaction.guild, interaction.user, interaction.options.getString('tempo'), interaction.options.getString('motivo'));
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply(`✅ Justificativa registrada! Sua vaga fica guardada até <t:${Math.floor(r.j.fim / 1000)}:D>.`);
    }

    if (sub === 'voltar') {
      if (!N.encerrarJustificativa(uid)) return responder(interaction, 'Você não tem justificativa ativa.');
      return responder(interaction, '✅ Bem-vinda de volta! Justificativa encerrada. 💜');
    }

    if (sub === 'status') {
      const vagas = V.doUsuario(uid);
      if (!vagas.length) return responder(interaction, 'Você não ocupa nenhuma vaga.');
      const j = N.justificativa(uid);
      const emb = new EmbedBuilder().setColor(0xf5a3c7).setTitle('🌙 Sua situação').addFields({ name: 'Vagas', value: vagas.map((v) => v.nome).join(', ') });
      if (j && j.fim > Date.now()) {
        emb.addFields({ name: 'Justificativa', value: `Ativa até <t:${Math.floor(j.fim / 1000)}:D>\nMotivo: ${j.motivo}` });
      } else {
        const dias = Math.floor((Date.now() - N.marco(uid, vagas)) / N.DIA);
        emb.addFields({ name: 'Sem justificativa', value: `Você está há **${dias} dia(s)** sem aparecer.\nAviso com ${N.avisoDias()} dias; liberação com ${N.liberarDias()} dias.` });
      }
      return interaction.reply({ embeds: [emb], flags: EPH });
    }
  },
};
