const { PermissionFlagsBits } = require('discord.js');
const UI = require('../ui/componentes');
const db = require('../db');
const N = require('../moderacao/nucleo');

const TIPOS = ['dmAviso', 'dmBan', 'dmExpulsao'];

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // Lista de regras ao digitar /aviso dar
      if (interaction.isAutocomplete() && interaction.commandName === 'aviso') {
        const foco = String(interaction.options.getFocused()).toLowerCase();
        const opcoes = N.regras()
          .map((texto, i) => ({ name: `${i + 1}. ${texto}`.slice(0, 100), value: i + 1 }))
          .filter((o) => o.name.toLowerCase().includes(foco))
          .slice(0, 25);
        return await interaction.respond(opcoes);
      }

      // Botões do painel de status: abrem a janela de edição
      if (interaction.isButton() && interaction.customId.startsWith('moderacao:editar:')) {
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
          return await interaction.reply(UI.erro('Você não tem permissão para isso.'));
        }
        const tipo = interaction.customId.split(':')[2];
        if (!TIPOS.includes(tipo)) return;
        return await interaction.showModal(N.modalMensagem(tipo));
      }

      // Janela de edição das mensagens de DM
      if (interaction.isModalSubmit() && interaction.customId.startsWith('moderacao:modal:')) {
        if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
          return await interaction.reply(UI.erro('Você não tem permissão para isso.'));
        }
        const tipo = interaction.customId.split(':')[2];
        if (!TIPOS.includes(tipo)) return;

        const titulo = interaction.fields.getTextInputValue('titulo');
        const texto = interaction.fields.getTextInputValue('texto');
        db.set(`config.moderacao.mensagens.${tipo}`, { titulo, texto });

        return await interaction.reply(UI.ok('Mensagem salva. Variáveis disponíveis: `{servidor}` `{motivo}` `{regra}` `{avisos}` `{limite}`.'));
      }
    } catch (erro) {
      console.error('[Moderação] erro na interação:', erro);
    }
  },
};
