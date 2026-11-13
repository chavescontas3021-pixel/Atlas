const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const N = require('../vagas/nucleo');

const EPH = MessageFlags.Ephemeral;

// Modal do /vagaadmin obras: linhas "Nome = Obra"
async function modalObras(interaction) {
  try {
    if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
    }
    await interaction.deferReply({ flags: EPH });
    const rel = await N.definirObras(interaction.fields.getTextInputValue('lista'));
    if (rel.feitas) await N.atualizarPainel(interaction.guild);
    let txt = `✅ Obra definida em **${rel.feitas}** vaga(s). Ainda sem obra: **${N.semObra().length}**.`;
    if (rel.padronizadas) txt += `\n📚 ${rel.padronizadas} obra(s) trocada(s) pelo título oficial.`;
    if (rel.naoConfirmadas.length) txt += `\n🤔 Não consegui confirmar que existe: ${rel.naoConfirmadas.slice(0, 10).join(', ')} (usei como você escreveu; veja \`/vagaadmin conferirobras\`).`;
    if (rel.naoAchadas.length) txt += `\n❓ Não achei: ${rel.naoAchadas.slice(0, 15).join(', ')}`;
    if (rel.invalidas) txt += `\n⚠️ ${rel.invalidas} linha(s) sem o formato \`Nome = Obra\`.`;
    return interaction.editReply(txt);
  } catch (err) {
    console.error('[Vagas] obras:', err);
    try { await interaction.editReply('Deu erro ao salvar as obras.'); } catch { /* ignora */ }
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId === 'vagas:modal:obras') return modalObras(interaction);
    if (interaction.customId !== 'vagas:modal:lote') return;
    try {
      if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
      }
      await interaction.deferReply({ flags: EPH });
      const grupo = interaction.fields.getTextInputValue('grupo').trim();
      const linhas = interaction.fields.getTextInputValue('lista').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let criadas = 0;
      const puladas = [];
      for (const nome of linhas.slice(0, 100)) {
        if (nome.length > 60 || N.acharTodos({ ext: N.chaveManual(nome, grupo), nome, grupo }).length) {
          puladas.push(nome.slice(0, 30));
          continue;
        }
        N.salvar({ id: N.proximoId(), nome, grupo, ocupanteId: null, desde: null });
        criadas++;
      }
      await N.atualizarPainel(interaction.guild);
      let txt = `✅ **${criadas}** vaga(s) criada(s).`;
      if (linhas.length > 100) txt += '\n⚠️ Só as 100 primeiras linhas foram lidas.';
      if (puladas.length) txt += `\n⏭️ Puladas (repetidas ou com mais de 60 letras): ${puladas.slice(0, 15).join(', ')}${puladas.length > 15 ? '…' : ''}`;
      return interaction.editReply(txt);
    } catch (err) {
      console.error('[Vagas] lote:', err);
      try { await interaction.editReply('Deu erro ao criar as vagas.'); } catch { /* ignora */ }
    }
  },
};
                                                                                                              
