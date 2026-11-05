const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const C = require('../parceria/convites');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });

function linha(c) {
  const icone = c.quebrado ? '🔴' : c.ultimaChecagem ? '🟢' : '⚪';
  const nome = c.servidor || 'servidor não identificado';
  const promotor = c.promotorId ? ` • <@${c.promotorId}>` : '';
  return `${icone} **${nome}** — \`${c.codigo}\`${promotor}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('parceriaconvites')
    .setDescription('Vigia os convites das parcerias e avisa quando algum quebrar (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração e o resumo'))
    .addSubcommand((s) =>
      s
        .setName('ligar')
        .setDescription('Liga ou desliga a vigia automática')
        .addBooleanOption((o) => o.setName('ligado').setDescription('Ligar (true) ou desligar (false)').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('canal-aviso')
        .setDescription('Canal da staff onde o aviso de convite quebrado aparece')
        .addChannelOption((o) => o.setName('canal').setDescription('O canal').setRequired(true).addChannelTypes(...TEXTO))
    )
    .addSubcommand((s) =>
      s
        .setName('cargo-aviso')
        .setDescription('Cargo marcado no aviso (vazio = não marcar ninguém)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo a marcar'))
    )
    .addSubcommand((s) =>
      s
        .setName('horas')
        .setDescription('De quantas em quantas horas cada convite é conferido')
        .addIntegerOption((o) => o.setName('horas').setDescription('Entre 1 e 72').setRequired(true).setMinValue(1).setMaxValue(72))
    )
    .addSubcommand((s) => s.setName('listar').setDescription('Lista os convites guardados'))
    .addSubcommand((s) => s.setName('verificar').setDescription('Confere todos os convites agora'))
    .addSubcommand((s) =>
      s
        .setName('importar')
        .setDescription('Procura convites antigos num canal de parceria e guarda na lista')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal de parcerias').setRequired(true).addChannelTypes(...TEXTO))
        .addIntegerOption((o) => o.setName('mensagens').setDescription('Quantas mensagens ler (padrão 300)').setMinValue(50).setMaxValue(1000))
    )
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Guarda um convite manualmente')
        .addStringOption((o) => o.setName('convite').setDescription('Link ou código do convite').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Tira um convite da lista')
        .addStringOption((o) => o.setName('convite').setDescription('Link ou código do convite').setRequired(true))
    ),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const c = C.conf();
      const lista = Object.values(C.todos());
      const quebrados = lista.filter((x) => x.quebrado);
      const embed = new EmbedBuilder()
        .setColor(COR)
        .setTitle('🔗 Vigia de convites')
        .setDescription(
          `Estado: ${c.ligado ? '🟢 Ligada' : '🔴 Desligada'}\n` +
            `Canal do aviso: ${c.canalAviso ? `<#${c.canalAviso}>` : '⚠️ não definido'}\n` +
            `Cargo marcado: ${c.cargoAviso ? `<@&${c.cargoAviso}>` : 'ninguém'}\n` +
            `Confere a cada: **${c.horas}h**\n\n` +
            `Convites guardados: **${lista.length}**\n` +
            `Quebrados agora: **${quebrados.length}**`
        );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'ligar') {
      const ligado = interaction.options.getBoolean('ligado');
      C.setCfg('ligado', ligado);
      return responder(interaction, ligado ? '🟢 Vigia de convites ligada.' : '🔴 Vigia de convites desligada.');
    }

    if (sub === 'canal-aviso') {
      const canal = interaction.options.getChannel('canal');
      C.setCfg('canalAviso', canal.id);
      return responder(interaction, `✅ Os avisos de convite quebrado vão para <#${canal.id}>.`);
    }

    if (sub === 'cargo-aviso') {
      const cargo = interaction.options.getRole('cargo');
      C.setCfg('cargoAviso', cargo ? cargo.id : null);
      return responder(interaction, cargo ? `✅ Vou marcar <@&${cargo.id}> nos avisos.` : '✅ Não vou marcar ninguém nos avisos.');
    }

    if (sub === 'horas') {
      const h = interaction.options.getInteger('horas');
      C.setCfg('horas', h);
      return responder(interaction, `✅ Cada convite será conferido a cada **${h}h**.`);
    }

    if (sub === 'listar') {
      const lista = Object.values(C.todos()).sort((a, b) => Number(b.quebrado) - Number(a.quebrado) || b.criadoEm - a.criadoEm);
      if (!lista.length) return responder(interaction, 'Nenhum convite guardado ainda. Use `/parceriaconvites importar` ou `adicionar`.');
      let texto = lista.map(linha).join('\n');
      if (texto.length > 3900) texto = texto.slice(0, 3900).replace(/\n[^\n]*$/, '') + '\n…';
      const embed = new EmbedBuilder()
        .setColor(COR)
        .setTitle(`🔗 Convites guardados (${lista.length})`)
        .setDescription(texto)
        .setFooter({ text: '🟢 funcionando • 🔴 quebrado • ⚪ ainda não conferido' });
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'verificar') {
      if (!Object.keys(C.todos()).length) return responder(interaction, 'Nenhum convite guardado para conferir.');
      await interaction.deferReply({ flags: EPH });
      const r = await C.verificarTodos(client);
      let msg = `✅ Conferi **${r.total}** convite(s): **${r.ok}** funcionando, **${r.quebrados.length}** quebrado(s)`;
      if (r.erros) msg += `, ${r.erros} não consegui conferir (tente de novo depois)`;
      msg += '.';
      if (r.quebrados.length) msg += '\n\n' + r.quebrados.map(linha).join('\n');
      return interaction.editReply({ content: msg.slice(0, 1900) });
    }

    if (sub === 'importar') {
      const canal = interaction.options.getChannel('canal');
      const limite = interaction.options.getInteger('mensagens') || 300;
      await interaction.deferReply({ flags: EPH });
      try {
        const r = await C.importar(client, canal, limite);
        return interaction.editReply(
          `✅ Li **${r.lidas}** mensagens de <#${canal.id}> e guardei **${r.novos}** convite(s) novo(s).\n` +
            (r.novos ? 'Use `/parceriaconvites verificar` para conferir todos agora.' : '')
        );
      } catch (e) {
        return interaction.editReply('❌ Não consegui ler esse canal. Confira se eu posso ver e ler o histórico dele.');
      }
    }

    if (sub === 'adicionar') {
      const codigo = C.codigoDe(interaction.options.getString('convite'));
      if (!codigo) return responder(interaction, '❌ Isso não parece um convite válido.');
      await interaction.deferReply({ flags: EPH });
      C.registrar({ codigo });
      const r = await C.processar(client, codigo);
      const estado = !r ? '' : r.estado === 'ok' ? '🟢 está funcionando' : r.estado === 'quebrado' ? '🔴 já está quebrado' : '⚪ não consegui conferir agora';
      return interaction.editReply(`✅ Convite \`${codigo}\` guardado — ${estado}.`);
    }

    if (sub === 'remover') {
      const codigo = C.codigoDe(interaction.options.getString('convite'));
      if (!codigo || !C.remover(codigo)) return responder(interaction, '❌ Não achei esse convite na lista.');
      return responder(interaction, `🗑️ Convite \`${codigo}\` removido da lista.`);
    }
  },
};
