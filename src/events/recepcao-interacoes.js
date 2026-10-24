const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const F = require('../recepcao/fluxo');

const EPH = MessageFlags.Ephemeral;

async function botao(interaction) {
  const [, acao, userId] = interaction.customId.split(':');
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse botão não é para você 💜', flags: EPH });
  }
  if (acao === 'verificar') return F.verificar(interaction);
  if (acao === 'trocar') return F.trocar(interaction);
}

async function seletor(interaction) {
  const tipo = interaction.customId.split(':')[1];
  if (tipo === 'molde') return F.escolherMolde(interaction);
  if (tipo === 'emoji') return F.escolherEmoji(interaction);
}

async function modal(interaction) {
  if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
  }
  const tipo = interaction.customId.split(':')[2];
  if (!['boasVindas', 'passos', 'sucesso'].includes(tipo)) return;

  const titulo = interaction.fields.getTextInputValue('titulo');
  const texto = interaction.fields.getTextInputValue('texto');
  db.set(`config.recepcao.mensagens.${tipo}`, { titulo, texto });

  await interaction.reply({
    content: '✅ Mensagem salva! Você pode usar {usuario}, {servidor}, {personagem}, {nick} e {emoji} no texto.',
    flags: EPH,
  });
}

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('recepcao:')) {
        return await botao(interaction);
      }
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('recepcao:')) {
        return await seletor(interaction);
      }
      if (interaction.isModalSubmit() && interaction.customId.startsWith('recepcao:modal:')) {
        return await modal(interaction);
      }
    } catch (erro) {
      console.error('[Recepção] erro na interação:', erro);
      const msg = { content: 'Ops, deu erro nessa etapa. Chame a staff.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
