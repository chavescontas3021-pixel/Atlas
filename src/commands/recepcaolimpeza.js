const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const Limpeza = require('../recepcao/limpeza');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });
const horas = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h} h`);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaolimpeza')
    .setDescription('Limpeza automática de recepções paradas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração e quantas recepções estão paradas'))
    .addSubcommand((s) =>
      s
        .setName('ligar')
        .setDescription('Liga ou desliga a limpeza automática')
        .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('tempos')
        .setDescription('Define depois de quantas horas parada acontece cada etapa')
        .addNumberOption((o) => o.setName('lembrete').setDescription('Horas até o lembrete no canal (padrão 12)').setRequired(true).setMinValue(0.02).setMaxValue(720))
        .addNumberOption((o) => o.setName('aviso').setDescription('Horas até avisar a staff (padrão 24)').setRequired(true).setMinValue(0.02).setMaxValue(720))
        .addNumberOption((o) => o.setName('apagar').setDescription('Horas até apagar o canal (padrão 48)').setRequired(true).setMinValue(0.02).setMaxValue(720))
    )
    .addSubcommand((s) =>
      s
        .setName('canal-aviso')
        .setDescription('Canal da staff que recebe o aviso com os botões Apagar / Dar mais tempo')
        .addChannelOption((o) => o.setName('canal').setDescription('O canal').setRequired(true).addChannelTypes(...TEXTO))
    )
    .addSubcommand((s) =>
      s
        .setName('cargo-aviso')
        .setDescription('Cargo marcado no aviso (vazio = cargo de staff da recepção)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo a marcar'))
    )
    .addSubcommand((s) => s.setName('executar').setDescription('Roda a verificação agora (mesmo com a limpeza desligada)')),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const r = await Limpeza.resumo(client);
      const c = r.c;
      const embed = new EmbedBuilder()
        .setColor(0xf5a3c7)
        .setTitle('🧹 Limpeza de recepção')
        .setDescription(
          `Estado: ${c.ligado ? '🟢 Ligada' : '🔴 Desligada'}\n` +
            `⏰ Lembrete no canal: **${horas(c.lembrete)}** parada\n` +
            `📣 Aviso à staff: **${horas(c.aviso)}**\n` +
            `🗑️ Apagar o canal: **${horas(c.apagar)}**\n` +
            `Canal do aviso: ${c.canalAviso ? `<#${c.canalAviso}>` : '⚠️ não definido'}\n` +
            `Cargo marcado: ${c.cargoAviso ? `<@&${c.cargoAviso}>` : 'ninguém'}\n\n` +
            `Recepções abertas: **${r.abertas}**\n` +
            `Já lembradas: **${r.lembradas}** • Aguardando a staff: **${r.avisadas}**\n` +
            `Ignoradas (staff assumiu, aguardando autorização ou teste): **${r.excecoes}**`
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ligar') {
      const ligado = interaction.options.getBoolean('ligado');
      if (ligado && !Limpeza.conf().canalAviso) {
        return responder(interaction, '❌ Defina antes o canal do aviso com `/recepcaolimpeza canal-aviso`. Sem ele eu não apago nada.');
      }
      Limpeza.setCfg('ligado', ligado);
      return responder(interaction, ligado ? '🟢 Limpeza de recepção ligada.' : '🔴 Limpeza de recepção desligada.');
    }

    if (sub === 'tempos') {
      const x = interaction.options.getNumber('lembrete');
      const y = interaction.options.getNumber('aviso');
      const z = interaction.options.getNumber('apagar');
      if (!(x < y && y < z)) {
        return responder(interaction, '❌ Os tempos precisam crescer: **lembrete < aviso < apagar** (ex.: 12, 24, 48).');
      }
      Limpeza.setCfg('lembreteHoras', x);
      Limpeza.setCfg('avisoHoras', y);
      Limpeza.setCfg('apagarHoras', z);
      return responder(interaction, `✅ Lembrete em **${horas(x)}**, aviso à staff em **${horas(y)}** e apagar em **${horas(z)}** de recepção parada.`);
    }

    if (sub === 'canal-aviso') {
      const canal = interaction.options.getChannel('canal');
      Limpeza.setCfg('canalAviso', canal.id);
      return responder(interaction, `✅ Os avisos de recepção parada vão para <#${canal.id}>.`);
    }

    if (sub === 'cargo-aviso') {
      const cargo = interaction.options.getRole('cargo');
      Limpeza.setCfg('cargoAviso', cargo ? cargo.id : null);
      return responder(interaction, cargo ? `✅ Vou marcar <@&${cargo.id}> nos avisos.` : '✅ Vou marcar o cargo de staff da recepção.');
    }

    if (sub === 'executar') {
      await interaction.deferReply({ flags: EPH });
      const r = await Limpeza.tick(client, { forcar: true });
      return interaction.editReply(`✅ Verificação feita em **${r.total}** recepção(ões). Veja o resultado com \`/recepcaolimpeza status\`.`);
    }
  },
};
