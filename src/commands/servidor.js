const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags,
  PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const S = require('../servidor/nucleo');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('servidor')
    .setDescription('Desliga e liga o servidor inteiro (só administradores)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s
        .setName('desligar')
        .setDescription('Esconde todos os canais, menos o da staff. Nada é apagado')
        .addChannelOption((o) =>
          o
            .setName('canal-staff')
            .setDescription('Canal que continua como está, onde a staff vai usar /servidor ligar')
            .setRequired(true)
            .addChannelTypes(...TEXTO)
        )
        .addBooleanOption((o) => o.setName('pausar-convites').setDescription('Pausar também os convites do servidor (padrão: sim)'))
    )
    .addSubcommand((s) => s.setName('ligar').setDescription('Reabre todos os canais como estavam antes'))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra se o servidor está desligado')),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return responder(interaction, '❌ Só administradores podem usar isso.');
    }
    const sub = interaction.options.getSubcommand();
    const st = S.estado();

    if (sub === 'status') {
      if (!st) return responder(interaction, '🟢 O servidor está **ligado** (normal).');
      const restantes = Object.keys(st.canais || {}).length;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('🔴 Servidor desligado')
        .setDescription(
          `Desde <t:${Math.floor(st.em / 1000)}:R> por <@${st.por}>\n` +
            `Canal mantido: ${st.mantido ? `<#${st.mantido}>` : '—'}\n` +
            `Canais escondidos (a restaurar): **${restantes}**\n` +
            `Convites pausados pelo Atlas: ${st.convitesPausados ? 'sim' : 'não'}\n` +
            `Fase: ${st.fase === 'fechando' ? '⚠️ incompleto (rode `/servidor desligar` de novo para terminar)' : st.fase === 'abrindo' ? '⚠️ reabertura incompleta (rode `/servidor ligar`)' : 'completo'}`
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (S.estaOcupado()) return responder(interaction, '⏳ Já tem uma operação em andamento. Aguarde terminar.');

    if (sub === 'desligar') {
      if (st && st.fase === 'fechado') {
        return responder(interaction, '🔴 O servidor já está desligado. Use `/servidor ligar` para reabrir.');
      }
      const canal = interaction.options.getChannel('canal-staff');
      const pausar = interaction.options.getBoolean('pausar-convites') !== false;
      S.pedirConfirmacao(interaction.user.id, { canalMantido: canal.id, pausarConvites: pausar });

      const total = interaction.guild.channels.cache.filter((c) => c.permissionOverwrites).size;
      const embed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle('⚠️ Desligar o servidor?')
        .setDescription(
          `Vou **esconder ${total - 1} canais** de todo mundo, menos de administradores.\n` +
            `Fica como está: <#${canal.id}> (use ele para reabrir).\n` +
            `Convites: ${pausar ? 'serão pausados' : 'continuam ativos'}.\n\n` +
            (st ? '*Existe um desligamento incompleto: vou continuar de onde parou.*\n\n' : '') +
            'Nada é apagado. Para reabrir: `/servidor ligar`. Pode levar alguns minutos.'
        );
      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`servidor:sim:${interaction.user.id}`).setLabel('Desligar agora').setEmoji('🔌').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`servidor:nao:${interaction.user.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ embeds: [embed], components: [botoes], flags: EPH });
    }

    if (sub === 'ligar') {
      if (!st) return responder(interaction, '🟢 O servidor já está ligado.');
      await interaction.deferReply({ flags: EPH });
      const r = await S.ligar(
        interaction.guild,
        { porId: interaction.user.id },
        (f, t) => interaction.editReply(`⏳ Reabrindo canais... ${f}/${t}`).catch(() => {}),
      );
      let msg = `🟢 Servidor **ligado**: **${r.restaurados}** canais restaurados.`;
      if (r.sumidos) msg += `\n${r.sumidos} canal(is) não existem mais (ignorados).`;
      if (r.convites) msg += `\nConvites: ${r.convites}.`;
      if (r.falhas.length) {
        msg = `⚠️ Reabri **${r.restaurados}** canais, mas **${r.falhas.length}** falharam:\n${r.falhas.slice(0, 8).join('\n')}\n\nConfira minhas permissões e rode \`/servidor ligar\` de novo: só os que faltam serão refeitos.`;
      }
      return interaction.editReply(msg.slice(0, 1900));
    }
  },
};
