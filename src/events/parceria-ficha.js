const { MessageFlags } = require('discord.js');
const Ficha = require('../parceria/ficha');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('pficha:abrir:')) {
        const [, , tipo, dono] = interaction.customId.split(':');
        if (!Ficha.tipoValido(tipo)) return;
        if (dono && interaction.user.id !== dono) {
          return interaction.reply({
            content: 'Esse painel é de outra pessoa. Use /parceriaficha para abrir o seu.',
            flags: MessageFlags.Ephemeral,
          });
        }
        const r = await Ficha.checar(client, interaction.user.id, tipo);
        if (r.erro) return interaction.reply(Ficha.erro(r.erro));
        return interaction.showModal(Ficha.formulario(tipo));
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('pficha:modal:')) {
        const tipo = interaction.customId.split(':')[2];
        if (!Ficha.tipoValido(tipo)) return;
        await interaction.deferReply();
        const resposta = await Ficha.enviar(client, interaction, tipo);
        return interaction.editReply(typeof resposta === 'string' ? { content: resposta } : resposta);
      }
    } catch (erro) {
      console.error('[Ficha] erro:', erro);
      const msg = { content: 'Ops, deu erro na ficha. Tente de novo.' };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
