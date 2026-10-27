const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const F = require('../ticket/fluxo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = interaction.customId;
    if (!id || !id.startsWith('ticket:')) return;
    const [, acao, arg, arg2] = id.split(':');

    try {
      if (interaction.isButton()) {
        if (acao === 'novo') return await F.abrirModal(interaction, arg);
        if (acao === 'assumir') return await F.assumir(interaction);
        if (acao === 'fechar') return await F.abrirModalFechar(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (acao === 'modal') return await F.criarTicket(interaction, arg);
        if (acao === 'modalfechar') return await F.receberFechar(interaction);

        if (acao === 'pmodal') {
          if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
          }
          const N = require('../ticket/nucleo');
          if (!N.acharPainel(arg) || !['painel', 'abertura'].includes(arg2)) {
            return await interaction.reply({ content: 'Esse painel não existe mais.', flags: EPH });
          }
          const titulo = interaction.fields.getTextInputValue('titulo');
          const texto = interaction.fields.getTextInputValue('texto');
          db.set(`config.ticket.paineis.${arg}.mensagens.${arg2}`, { titulo, texto });
          const dica =
            arg2 === 'painel'
              ? 'Poste o painel de novo com `/ticketpainel postar`.'
              : 'Vale para os próximos tickets desse painel. Dá para usar {usuario}, {numero}, {categoria} e {emoji}.';
          return await interaction.reply({ content: `✅ Mensagem salva! ${dica}`, flags: EPH });
        }

        if (acao === 'cfgmodal') {
          if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
          }
          if (!['painel', 'abertura'].includes(arg)) return;
          const titulo = interaction.fields.getTextInputValue('titulo');
          const texto = interaction.fields.getTextInputValue('texto');
          db.set(`config.ticket.mensagens.${arg}`, { titulo, texto });
          const dica =
            arg === 'painel'
              ? 'Poste o painel de novo com `/ticketconfig painel` para ele aparecer.'
              : 'No texto dá para usar {usuario}, {numero}, {categoria} e {emoji}. Vale para os próximos tickets.';
          return await interaction.reply({ content: `✅ Mensagem salva! ${dica}`, flags: EPH });
        }
      }
    } catch (erro) {
      console.error('[Ticket] erro na interação:', erro);
      const msg = { content: 'Ops, deu erro nessa etapa. Chame a staff.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
