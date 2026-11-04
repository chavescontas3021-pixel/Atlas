const { MessageFlags } = require('discord.js');
const Ficha = require('../parceria/ficha');

const sussurro = (i) => (i.inGuild() ? { flags: MessageFlags.Ephemeral } : {});

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1) Clicou em Parceria ou Aliança: abre o formulário daquele tipo
      if (interaction.isButton() && interaction.customId.startsWith('pficha:abrir:')) {
        const tipo = interaction.customId.split(':')[2];
        if (!Ficha.tipoValido(tipo)) return;
        const r = await Ficha.checar(client, interaction.user.id, tipo);
        if (r.erro) return interaction.reply({ content: `❌ ${r.erro}`, ...sussurro(interaction) });
        return interaction.showModal(Ficha.formulario(tipo));
      }

      // 2) Enviou o formulário: valida e publica
      if (interaction.isModalSubmit() && interaction.customId.startsWith('pficha:modal:')) {
        const tipo = interaction.customId.split(':')[2];
        if (!Ficha.tipoValido(tipo)) return;
        await interaction.deferReply(sussurro(interaction));
        const resposta = await Ficha.enviar(client, interaction, tipo);
        return interaction.editReply({ content: resposta });
      }
    } catch (erro) {
      console.error('[Ficha] erro:', erro);
      const msg = { content: 'Ops, deu erro na ficha. Tente de novo.', ...sussurro(interaction) };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
