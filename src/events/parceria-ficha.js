const { MessageFlags } = require('discord.js');
const Ficha = require('../parceria/ficha');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1) Clicou em Parceria ou Aliança: abre o formulário daquele tipo
      if (interaction.isButton() && interaction.customId.startsWith('pficha:abrir:')) {
        const [, , tipo, dono] = interaction.customId.split(':');
        if (!Ficha.tipoValido(tipo)) return;
        // O painel é de quem usou o comando: outra pessoa na conversa não preenche por ele
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

      // 2) Enviou o formulário: valida, publica e responde na conversa
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
