const {
  ActionRowBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const M = require('../mensagens/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete?.() && interaction.commandName === 'mensagens') {
        const foco = interaction.options.getFocused(true);
        if (foco.name === 'grupo') {
          const q = String(foco.value).toLowerCase();
          return interaction.respond(M.grupos().filter((g) => g.toLowerCase().includes(q)).slice(0, 25).map((g) => ({ name: g, value: g })));
        }
        let itens;
        if (interaction.options.getSubcommand() === 'restaurar') {
          itens = Object.keys(M.edicoes()).map((id) => M.catalogo().porId.get(id)).filter(Boolean)
            .filter((e) => e.modelo.toLowerCase().includes(String(foco.value).toLowerCase()));
        } else {
          itens = M.buscar(foco.value);
        }
        return interaction.respond(itens.slice(0, 25).map((e) => ({
          name: M.limpar(`[${[...e.grupos][0]}] ${e.modelo}`, 100),
          value: e.id,
        })));
      }

      const id = interaction.customId;
      if (typeof id !== 'string' || !id.startsWith('msgs:')) return;

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'Só a staff pode usar isso.', flags: EPH });
      }

      if (interaction.isStringSelectMenu?.() && id === 'msgs:sel') {
        const e = M.catalogo().porId.get(interaction.values[0]);
        if (!e) return interaction.reply({ content: 'Mensagem não encontrada (use /mensagens atualizar).', flags: EPH });
        return interaction.reply({ ...M.detalhe(e), flags: EPH });
      }

      if (interaction.isButton?.()) {
        const [, acao, mid] = id.split(':');
        const e = M.catalogo().porId.get(mid);
        if (!e) return interaction.reply({ content: 'Mensagem não encontrada.', flags: EPH });
        if (acao === 'editar') {
          const atual = M.editada(mid)?.texto || e.modelo;
          const campo = new TextInputBuilder().setCustomId('texto').setLabel('Novo texto (variáveis: {1} {2}...)')
            .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000).setValue(atual.slice(0, 4000));
          const modal = new ModalBuilder().setCustomId(`msgs:modal:${mid}`).setTitle('Editar mensagem')
            .addComponents(new ActionRowBuilder().addComponents(campo));
          return interaction.showModal(modal);
        }
        if (acao === 'restaurar') {
          M.restaurar(mid);
          return interaction.update({ ...M.detalhe(e) });
        }
      }

      if (interaction.isModalSubmit?.() && id.startsWith('msgs:modal:')) {
        const mid = id.split(':')[2];
        const novo = interaction.fields.getTextInputValue('texto');
        if (!M.salvarEdicao(mid, novo, interaction.user.id)) {
          return interaction.reply({ content: 'Mensagem não encontrada.', flags: EPH });
        }
        const e = M.catalogo().porId.get(mid);
        return interaction.reply({ ...M.detalhe(e), content: '✅ Salvo! Vale a partir da próxima vez que o bot enviar esse texto.', flags: EPH });
      }
    } catch (erro) {
      console.error('[Mensagens]', erro);
      if (interaction.isRepliable?.() && !interaction.replied && !interaction.deferred) {
        interaction.reply({ content: 'Deu erro nas mensagens.', flags: EPH }).catch(() => {});
      }
    }
  },
};
