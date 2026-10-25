const {
  ActionRowBuilder, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits,
  SlashCommandBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const N = require('../aniversario/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aniversarioconfig')
    .setDescription('Configura os aniversários (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga os avisos de aniversário')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar?').setRequired(true)))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal da mensagem de festa')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('cargo').setDescription('Cargo de aniversariante (marcado na mensagem)')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true)))
    .addSubcommand((s) => s.setName('horario').setDescription('Horário do aviso (Brasília)')
      .addStringOption((o) => o.setName('hora').setDescription('Ex.: 08:00').setRequired(true)))
    .addSubcommand((s) => s.setName('mensagem').setDescription('Edita a mensagem de festa'))
    .addSubcommand((s) => s.setName('testar').setDescription('Manda uma mensagem de teste no canal'))
    .addSubcommand((s) => s.setName('agora').setDescription('Comemora hoje agora, se ainda não comemorou')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const canal = N.cfg('canal');
      const cargo = N.cfg('cargo');
      const total = Object.keys(N.datas()).length;
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle('🎂 Aniversários do Atlas')
        .addFields(
          { name: 'Estado', value: N.cfg('ativo', false) ? '🟢 Ligado' : '🔴 Desligado' },
          { name: 'Canal', value: canal ? `<#${canal}>` : 'não definido' },
          { name: 'Cargo de aniversariante', value: cargo ? `<@&${cargo}>` : 'não definido (a mensagem marca as pessoas)' },
          { name: 'Horário', value: `${N.hora()} (Brasília)` },
          { name: 'Cadastrados', value: `${total}` },
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ativar') {
      const ligado = interaction.options.getBoolean('ligado');
      db.set('config.aniversario.ativo', ligado);
      return responder(interaction, ligado ? '🟢 Aniversários ligados! Falta definir canal e cargo, se ainda não fez.' : '🔴 Aniversários desligados.');
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.aniversario.canal', canal.id);
      return responder(interaction, `✅ Canal definido: ${canal}`);
    }

    if (sub === 'cargo') {
      const cargo = interaction.options.getRole('cargo');
      if (cargo.managed || cargo.id === interaction.guildId) return responder(interaction, '❌ Escolha um cargo comum.');
      db.set('config.aniversario.cargo', cargo.id);
      const eu = interaction.guild.members.me;
      const aviso = eu && cargo.comparePositionTo(eu.roles.highest) >= 0
        ? '\n⚠️ Esse cargo está acima do cargo do Atlas. Arraste o cargo do Atlas para cima dele, senão não consigo dar.'
        : '';
      return responder(interaction, `✅ Cargo definido: ${cargo}${aviso}`);
    }

    if (sub === 'horario') {
      const h = N.normalizarHora(interaction.options.getString('hora'));
      if (!h) return responder(interaction, '❌ Hora inválida. Use o formato 08:00.');
      db.set('config.aniversario.hora', h);
      return responder(interaction, `✅ O aviso sai às **${h}** (Brasília).`);
    }

    if (sub === 'mensagem') {
      const atual = N.mensagem('anuncio');
      const modal = new ModalBuilder()
        .setCustomId('aniversario:modal:anuncio')
        .setTitle('Editar mensagem de festa')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short)
              .setMaxLength(200).setRequired(true).setValue(atual.titulo.slice(0, 200)),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('texto').setLabel('Texto da mensagem').setStyle(TextInputStyle.Paragraph)
              .setMaxLength(2000).setRequired(true).setValue(atual.texto.slice(0, 2000)),
          ),
        );
      return interaction.showModal(modal);
    }

    if (sub === 'testar') {
      await interaction.deferReply({ flags: EPH });
      const r = await N.celebrar(interaction.guild, [interaction.user.id], { teste: true });
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply('✅ Mensagem de teste enviada (sem dar cargo).');
    }

    if (sub === 'agora') {
      await interaction.deferReply({ flags: EPH });
      const hoje = N.hojeBRT();
      const ids = N.aniversariantesDeHoje(hoje);
      if (!ids.length) return interaction.editReply('ℹ️ Ninguém faz aniversário hoje.');
      const r = await N.celebrar(interaction.guild, ids);
      if (r.erro) return interaction.editReply(`❌ ${r.erro}`);
      db.set('aniversario.ultimoDia', hoje.chave);
      return interaction.editReply(`🎉 Comemorado: ${r.qtd} aniversariante(s).${r.falhasCargo ? ` ⚠️ ${r.falhasCargo} sem cargo (veja a posição do cargo do Atlas).` : ''}`);
    }
  },
};
