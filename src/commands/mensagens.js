const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const M = require('../mensagens/nucleo');

const EPH = MessageFlags.Ephemeral;
const POR_PAGINA = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mensagens')
    .setDescription('Edita os textos que o bot envia (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('editar').setDescription('Escolhe uma mensagem e edita')
      .addStringOption((o) => o.setName('texto').setDescription('Digite um pedaço do texto para achar').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('buscar').setDescription('Procura mensagens para editar')
      .addStringOption((o) => o.setName('busca').setDescription('Palavras do texto'))
      .addStringOption((o) => o.setName('grupo').setDescription('Parte do bot (ex: rpg, vagas, chefe)').setAutocomplete(true))
      .addIntegerOption((o) => o.setName('pagina').setDescription('Página (padrão 1)').setMinValue(1)))
    .addSubcommand((s) => s.setName('editadas').setDescription('Mostra o que você já editou'))
    .addSubcommand((s) => s.setName('restaurar').setDescription('Volta uma mensagem ao original')
      .addStringOption((o) => o.setName('texto').setDescription('Mensagem editada').setRequired(true).setAutocomplete(true)))
    .addSubcommand((s) => s.setName('restaurartudo').setDescription('Volta TODAS as mensagens ao original')
      .addBooleanOption((o) => o.setName('confirmar').setDescription('Marque sim para confirmar').setRequired(true)))
    .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga todas as edições')
      .addBooleanOption((o) => o.setName('ligado').setDescription('Sim = usa as edições; Não = usa os textos originais').setRequired(true)))
    .addSubcommand((s) => s.setName('atualizar').setDescription('Lê o código de novo (use depois de atualizar o bot)')),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'Só a staff pode usar isso.', flags: EPH });
    }
    const sub = interaction.options.getSubcommand();

    if (sub === 'editar') {
      const e = M.achar(interaction.options.getString('texto'));
      if (!e) return interaction.reply({ content: 'Não achei essa mensagem. Digite um pedaço do texto e escolha na lista.', flags: EPH });
      return interaction.reply({ ...M.detalhe(e), flags: EPH });
    }

    if (sub === 'buscar') {
      const achados = M.buscar(interaction.options.getString('busca'), interaction.options.getString('grupo'));
      const total = Math.max(1, Math.ceil(achados.length / POR_PAGINA));
      const pag = Math.min(interaction.options.getInteger('pagina') || 1, total);
      const fatia = achados.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);
      const p = M.listaComSeletor('🔎 Mensagens do bot', fatia, `${achados.length} encontradas • página ${pag}/${total}`);
      return interaction.reply({ ...p, flags: EPH });
    }

    if (sub === 'editadas') {
      const ed = M.edicoes();
      const itens = Object.keys(ed).map((id) => M.catalogo().porId.get(id)).filter(Boolean).slice(0, 25);
      const p = M.listaComSeletor('✏️ Mensagens editadas', itens, `${Object.keys(ed).length} editadas • edições ${M.ativo() ? 'ligadas' : 'DESLIGADAS'}`);
      return interaction.reply({ ...p, flags: EPH });
    }

    if (sub === 'restaurar') {
      const e = M.achar(interaction.options.getString('texto'));
      if (!e || !M.editada(e.id)) return interaction.reply({ content: 'Essa mensagem não está editada.', flags: EPH });
      M.restaurar(e.id);
      return interaction.reply({ content: '↩️ Mensagem restaurada ao original.', flags: EPH });
    }

    if (sub === 'restaurartudo') {
      if (!interaction.options.getBoolean('confirmar')) return interaction.reply({ content: 'Nada foi alterado.', flags: EPH });
      M.restaurarTudo();
      return interaction.reply({ content: '↩️ Todas as mensagens voltaram ao original.', flags: EPH });
    }

    if (sub === 'ativar') {
      const v = interaction.options.getBoolean('ligado');
      require('../db').set('config.mensagens.ativo', v);
      return interaction.reply({ content: v ? '✅ Edições ligadas.' : '⏸️ Edições desligadas (o bot usa os textos originais).', flags: EPH });
    }

    if (sub === 'atualizar') {
      const c = M.recarregar();
      return interaction.reply({ content: `🔄 ${c.lista.length} mensagens encontradas no código.`, flags: EPH });
    }
  },
};
