const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const F = require('../livraria/fluxo');

const EPH = MessageFlags.Ephemeral;

// Ações que só o dono da publicação pode usar (o 3º trecho do customId é o ID dele)
const DA_SESSAO = ['texto', 'editar', 'trocarcapa', 'trocarpdf', 'cancelar', 'publicar', 'classe', 'modaltexto'];
const TIPOS_MENSAGEM = ['painelPublicacao', 'painelFeedback'];

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = interaction.customId;
    if (!id || !id.startsWith('livraria:')) return;
    const [, acao, arg] = id.split(':');

    try {
      if (DA_SESSAO.includes(acao) && interaction.user.id !== arg) {
        return await interaction.reply({ content: 'Isso não é para você 💜', flags: EPH });
      }

      if (interaction.isButton()) {
        switch (acao) {
          case 'abrir':
            return await F.iniciarPublicacao(interaction);
          case 'texto':
          case 'editar':
            return await F.abrirModalTexto(interaction, arg);
          case 'trocarcapa':
            return await F.trocarCapa(interaction, arg);
          case 'trocarpdf':
            return await F.trocarPdf(interaction, arg);
          case 'cancelar':
            return await F.cancelar(interaction, arg);
          case 'publicar':
            return await F.publicar(interaction, arg);
          case 'apagar':
            return await F.pedirApagar(interaction, arg);
          case 'apagarok':
            return await F.confirmarApagar(interaction, arg);
          case 'feedback':
          case 'fbcorrigir':
            return await F.abrirFeedback(interaction);
        }
        return;
      }

      if (interaction.isStringSelectMenu()) {
        if (acao === 'classe') return await F.escolherClasse(interaction, arg);
        return;
      }

      if (interaction.isModalSubmit()) {
        if (acao === 'modaltexto') return await F.receberTexto(interaction, arg);
        if (acao === 'modalfeedback') return await F.receberFeedback(interaction);

        if (acao === 'modal') {
          if (!interaction.memberPermissions || !interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
            return await interaction.reply({ content: 'Você não tem permissão para isso.', flags: EPH });
          }
          if (!TIPOS_MENSAGEM.includes(arg)) return;
          const titulo = interaction.fields.getTextInputValue('titulo');
          const texto = interaction.fields.getTextInputValue('texto');
          db.set(`config.livraria.mensagens.${arg}`, { titulo, texto });
          return await interaction.reply({
            content: '✅ Mensagem salva! Repostar o painel (`/livraria painel`) para ela aparecer. Dá para usar {linhas} no texto.',
            flags: EPH,
          });
        }
      }
    } catch (erro) {
      console.error('[Livraria] erro na interação:', erro);
      const msg = { content: 'Ops, deu erro nessa etapa. Chame a staff.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
