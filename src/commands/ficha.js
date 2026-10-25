const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder,
  PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const N = require('../ficha/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

const personagemOpt = (o) => o.setName('personagem').setDescription('Qual personagem (se você tiver mais de um)').setAutocomplete(true);
const membroStaffOpt = (o) => o.setName('membro').setDescription('Outro membro (só staff)');

function ehStaff(interaction) {
  return !!(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
}

// Monta o formulário (com os valores atuais quando for edição)
function montarModal(customId, titulo, campos, ficha) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(titulo);
  for (const c of campos) {
    const input = new TextInputBuilder()
      .setCustomId(c.id)
      .setLabel(c.rotulo)
      .setStyle(c.estilo === 'longo' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setMaxLength(c.max)
      .setRequired(c.obrigatorio);
    if (ficha && ficha[c.id]) input.setValue(String(ficha[c.id]).slice(0, c.max));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

// Descobre qual ficha o comando quer mexer, já checando permissão
function resolver(interaction) {
  const alvo = interaction.options.getUser('membro') || interaction.user;
  if (alvo.id !== interaction.user.id && !ehStaff(interaction)) {
    return { erro: '❌ Só a staff pode mexer na ficha de outra pessoa.' };
  }
  const ref = interaction.options.getString('personagem');
  const f = N.acharFicha(alvo.id, ref);
  if (!f) {
    const qtd = N.doUsuario(alvo.id).length;
    if (!qtd) return { erro: alvo.id === interaction.user.id ? 'Você ainda não tem ficha. Use `/ficha criar`.' : 'Essa pessoa ainda não tem ficha.' };
    return { erro: 'Escolha qual personagem no campo **personagem** (comece a digitar o nome).' };
  }
  return { f, alvo };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ficha')
    .setDescription('Fichas de personagem da house')
    .addSubcommand((s) => s.setName('criar').setDescription('Cria a ficha de um personagem'))
    .addSubcommand((s) => s.setName('editar').setDescription('Edita a ficha (dados principais)')
      .addStringOption(personagemOpt).addUserOption(membroStaffOpt))
    .addSubcommand((s) => s.setName('detalhes').setDescription('Edita aparência, habilidades, gostos, medos e extras')
      .addStringOption(personagemOpt).addUserOption(membroStaffOpt))
    .addSubcommand((s) => s.setName('imagem').setDescription('Define a imagem da ficha')
      .addAttachmentOption((o) => o.setName('arquivo').setDescription('Imagem PNG, JPG, WEBP ou GIF').setRequired(true))
      .addStringOption(personagemOpt).addUserOption(membroStaffOpt))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra uma ficha')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)'))
      .addStringOption(personagemOpt))
    .addSubcommand((s) => s.setName('lista').setDescription('Lista os personagens de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)')))
    .addSubcommand((s) => s.setName('apagar').setDescription('Apaga uma ficha')
      .addStringOption(personagemOpt).addUserOption(membroStaffOpt)),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      if (!N.cfg('canal')) return responder(interaction, '❌ A staff ainda não definiu o canal das fichas (`/fichaconfig canal`).');
      if (N.doUsuario(interaction.user.id).length >= N.limite()) {
        return responder(interaction, `❌ Você já atingiu o limite de **${N.limite()}** ficha(s). Apague uma com \`/ficha apagar\`.`);
      }
      return interaction.showModal(montarModal('ficha:modal:criar', 'Nova ficha', N.CAMPOS_A, null));
    }

    if (sub === 'lista') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const lista = N.doUsuario(alvo.id);
      if (!lista.length) return responder(interaction, 'Essa pessoa ainda não tem ficha.');
      const txt = lista.map((f) => {
        const link = N.linkDaMensagem(interaction.guildId, f);
        return `📖 **${f.nome}** — ${f.obra}${link ? ` · [abrir](${link})` : ''}`;
      }).join('\n');
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xf5a3c7).setTitle(`Personagens de ${alvo.username}`).setDescription(txt)],
        allowedMentions: { parse: [] },
      });
    }

    if (sub === 'ver') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const ref = interaction.options.getString('personagem');
      const f = N.acharFicha(alvo.id, ref);
      if (!f) {
        const qtd = N.doUsuario(alvo.id).length;
        if (!qtd) return responder(interaction, alvo.id === interaction.user.id ? 'Você ainda não tem ficha. Use `/ficha criar`.' : 'Essa pessoa ainda não tem ficha.');
        return responder(interaction, 'Essa pessoa tem mais de um personagem. Escolha no campo **personagem** ou use `/ficha lista`.');
      }
      await interaction.deferReply();
      const url = await N.urlDaImagem(interaction.guild, f);
      return interaction.editReply({ embeds: [N.embedFicha(f, alvo, url)], allowedMentions: { parse: [] } });
    }

    const r = resolver(interaction);
    if (r.erro) return responder(interaction, r.erro);
    const { f, alvo } = r;

    if (sub === 'editar') {
      return interaction.showModal(montarModal(`ficha:modal:editar:${f.id}`, `Editar ${f.nome}`.slice(0, 45), N.CAMPOS_A, f));
    }

    if (sub === 'detalhes') {
      return interaction.showModal(montarModal(`ficha:modal:detalhes:${f.id}`, `Detalhes de ${f.nome}`.slice(0, 45), N.CAMPOS_B, f));
    }

    if (sub === 'imagem') {
      await interaction.deferReply({ flags: EPH });
      if (!N.cfg('canal')) return interaction.editReply('❌ A staff ainda não definiu o canal das fichas.');
      const img = await N.baixarImagem(interaction.options.getAttachment('arquivo'));
      if (img.erro) return interaction.editReply(`❌ ${img.erro}`);
      try {
        await N.publicar(interaction.guild, f, alvo, img);
      } catch {
        return interaction.editReply('❌ Não consegui atualizar a ficha no canal (falta permissão?).');
      }
      return interaction.editReply('✅ Imagem da ficha atualizada!');
    }

    if (sub === 'apagar') {
      const linha = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ficha:apagar:${f.id}`).setLabel('Apagar de vez').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
      );
      return interaction.reply({ content: `Tem certeza que quer apagar a ficha de **${f.nome}**? Não dá para desfazer.`, components: [linha], flags: EPH });
    }
  },
};
