const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const L = require('../logs/nucleo');

const EPH = MessageFlags.Ephemeral;
const TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const responder = (i, content) => i.reply({ content, flags: EPH });
const escolhas = Object.entries(L.CATEGORIAS).map(([value, name]) => ({ name: name.replace(/^\S+\s/, ''), value }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Registro de tudo o que acontece no servidor (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra onde cada log está indo'))
    .addSubcommand((s) => s.setName('padrao').setDescription('Canal que recebe todos os logs que não têm canal próprio')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal de logs').setRequired(true).addChannelTypes(...TEXTO)))
    .addSubcommand((s) => s.setName('canal').setDescription('Manda um tipo de log para um canal só dele')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo de log').setRequired(true).addChoices(...escolhas))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true).addChannelTypes(...TEXTO)))
    .addSubcommand((s) => s.setName('limpar').setDescription('Tira o canal próprio de um tipo (volta ao canal padrão)')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo de log').setRequired(true).addChoices(...escolhas)))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga um tipo de log')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo de log').setRequired(true).addChoices(...escolhas))
      .addBooleanOption((o) => o.setName('ligado').setDescription('Sim = registra; Não = para de registrar').setRequired(true)))
    .addSubcommand((s) => s.setName('ignorar').setDescription('Não registrar mensagens, voz e comandos de um canal (repita para desfazer)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal ou categoria').setRequired(true)))
    .addSubcommand((s) => s.setName('testar').setDescription('Manda uma mensagem de teste para cada canal de log')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const linhas = Object.entries(L.CATEGORIAS).map(([k, nome]) => {
        const id = L.canalId(k);
        const proprio = db.get(`config.logs.canais.${k}`);
        return `${L.ativa(k) ? '🟢' : '🔴'} ${nome}\n↳ ${id ? `<#${id}>${proprio ? '' : ' (padrão)'}` : '*sem canal*'}`;
      });
      const ign = L.ignorados();
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('📋 Logs do servidor')
        .setDescription(linhas.join('\n\n'))
        .addFields({ name: 'Canais ignorados', value: ign.length ? ign.map((c) => `<#${c}>`).join(', ') : 'nenhum' });
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'padrao') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.logs.padrao', canal.id);
      return responder(interaction, `✅ Todos os logs sem canal próprio vão para ${canal}.`);
    }

    if (sub === 'canal') {
      const tipo = interaction.options.getString('tipo');
      const canal = interaction.options.getChannel('canal');
      db.set(`config.logs.canais.${tipo}`, canal.id);
      return responder(interaction, `✅ ${L.CATEGORIAS[tipo]} → ${canal}.`);
    }

    if (sub === 'limpar') {
      const tipo = interaction.options.getString('tipo');
      db.remover(`config.logs.canais.${tipo}`);
      return responder(interaction, `✅ ${L.CATEGORIAS[tipo]} voltou para o canal padrão.`);
    }

    if (sub === 'ativar') {
      const tipo = interaction.options.getString('tipo');
      const ligado = interaction.options.getBoolean('ligado');
      const lista = (db.get('config.logs.desligados', []) || []).filter((x) => x !== tipo);
      if (!ligado) lista.push(tipo);
      db.set('config.logs.desligados', lista);
      return responder(interaction, `${ligado ? '🟢 Ligado' : '🔴 Desligado'}: ${L.CATEGORIAS[tipo]}.`);
    }

    if (sub === 'ignorar') {
      const canal = interaction.options.getChannel('canal');
      const lista = L.ignorados();
      if (lista.includes(canal.id)) {
        db.set('config.logs.ignorados', lista.filter((x) => x !== canal.id));
        return responder(interaction, `✅ ${canal} voltou a ser registrado.`);
      }
      db.set('config.logs.ignorados', [...lista, canal.id]);
      return responder(interaction, `✅ ${canal} não será mais registrado nos logs de mensagens, voz e comandos.`);
    }

    if (sub === 'testar') {
      await interaction.deferReply({ flags: EPH });
      let enviados = 0;
      for (const [k, nome] of Object.entries(L.CATEGORIAS)) {
        if (!L.canalId(k)) continue;
        await L.enviar(interaction.guild, k, L.embed('rosa', '🧪 Teste de log', `${nome}\nSe você está vendo isso, esse log está funcionando.`));
        enviados++;
      }
      return interaction.editReply(enviados ? `✅ Mandei ${enviados} mensagem(ns) de teste.` : '⚠️ Nenhum canal de log definido. Use `/logs padrao`.');
    }
  },
};
