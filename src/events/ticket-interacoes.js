const { PermissionFlagsBits } = require('discord.js');
const UI = require('../ui/componentes');
const db = require('../db');
const F = require('../ticket/fluxo');


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

      // Menu de categorias do painel público
      if (interaction.isStringSelectMenu() && acao === 'novo') {
        return await F.abrirModal(interaction, interaction.values[0]);
      }

      if (interaction.isModalSubmit()) {
        if (acao === 'modal') return await F.criarTicket(interaction, arg);
        if (acao === 'modalfechar') return await F.receberFechar(interaction);

        if (acao === 'pmodal') {
          if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply(UI.erro('Você não tem permissão para isso.'));
          }
          const N = require('../ticket/nucleo');
          if (!N.acharPainel(arg) || !['painel', 'abertura'].includes(arg2)) {
            return await interaction.reply(UI.erro('Esse painel não existe mais.'));
          }
          const titulo = interaction.fields.getTextInputValue('titulo');
          const texto = interaction.fields.getTextInputValue('texto');
          db.set(`config.ticket.paineis.${arg}.mensagens.${arg2}`, { titulo, texto });
          const dica =
            arg2 === 'painel'
              ? 'Poste o painel de novo com `/ticketpainel postar`.'
              : 'Vale para os próximos tickets desse painel. Dá para usar {usuario}, {numero}, {categoria} e {emoji}.';
          return await interaction.reply(UI.ok(`Mensagem salva. ${dica}`));
        }

        if (acao === 'cfgmodal') {
          if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply(UI.erro('Você não tem permissão para isso.'));
          }
          if (!['painel', 'abertura'].includes(arg)) return;
          const titulo = interaction.fields.getTextInputValue('titulo');
          const texto = interaction.fields.getTextInputValue('texto');
          db.set(`config.ticket.mensagens.${arg}`, { titulo, texto });
          const dica =
            arg === 'painel'
              ? 'Poste o painel de novo com `/ticketconfig painel` para ele aparecer.'
              : 'No texto dá para usar {usuario}, {numero}, {categoria} e {emoji}. Vale para os próximos tickets.';
          return await interaction.reply(UI.ok(`Mensagem salva. ${dica}`));
        }
      }
    } catch (erro) {
      console.error('[Ticket] erro na interação:', erro);
      const msg = UI.erro('Algo deu errado nessa etapa. Chame a staff.');
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
