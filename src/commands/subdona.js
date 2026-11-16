const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const Vigia = require('../subdona/vigia');
const N = require('../subdona/nucleo');
const Telas = require('../subdona/telas');
const Resumo = require('../subdona/resumo');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');

const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subdona')
    .setDescription('A Atlas como sub dona: ausência, poderes, delegados e diário')
    .addSubcommand((s) => s.setName('status').setDescription('Mostra como a sub dona está configurada'))
    .addSubcommand((s) => s.setName('modo').setDescription('Liga ou desliga TODO o modo sub dona (só o pai)')
      .addBooleanOption((o) => o.setName('ativo').setDescription('Modo sub dona ligado?').setRequired(true)))
    .addSubcommand((s) => s.setName('panico').setDescription('Tranca ou destranca todos os canais de texto (só o pai)')
      .addBooleanOption((o) => o.setName('ativo').setDescription('Ligar o pânico?').setRequired(true)))
    .addSubcommand((s) => s.setName('alertas').setDescription('Canal onde a sub dona avisa o que viu (vazio = DM do pai)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal de texto').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('ticket').setDescription('Quando a sub dona atende os tickets')
      .addStringOption((o) => o.setName('modo').setDescription('Quando atender').setRequired(true)
        .addChoices({ name: 'Só com o pai ausente', value: 'ausente' }, { name: 'Sempre', value: 'sempre' }, { name: 'Nunca', value: 'off' })))
    .addSubcommand((s) => s.setName('canais').setDescription('Canais movimentados: ali eu não castigo por flood')
      .addStringOption((o) => o.setName('acao').setDescription('O que fazer').setRequired(true)
        .addChoices({ name: 'Adicionar canal', value: 'add' }, { name: 'Tirar canal', value: 'tirar' }, { name: 'Ver a lista', value: 'ver' }))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal (para adicionar ou tirar)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice)))
    .addSubcommand((s) => s.setName('raid').setDescription('Quantas entradas em 1 minuto contam como raid')
      .addIntegerOption((o) => o.setName('limite').setDescription('De 3 a 50 (padrão 8)').setRequired(true).setMinValue(3).setMaxValue(50)))
    .addSubcommand((s) => s.setName('ausente').setDescription('Avisa que você saiu e deixa a sub dona no comando (só o pai)')
      .addStringOption((o) => o.setName('motivo').setDescription('Por que está ausente (aparece para quem te marcar)').setMaxLength(200))
      .addIntegerOption((o) => o.setName('horas').setDescription('Volta em quantas horas? (vazio = até você voltar)').setMinValue(1).setMaxValue(720))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal onde eu aviso a todos que você está ausente').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('voltar').setDescription('Você voltou: mostra o que aconteceu e tira o modo ausência (só o pai)'))
    .addSubcommand((s) => s.setName('poder').setDescription('Define o que a sub dona pode fazer (só o pai)')
      .addStringOption((o) => o.setName('poder').setDescription('Qual poder').setRequired(true)
        .addChoices(...Object.entries(N.PODERES).map(([valor, p]) => ({ name: p.nome, value: valor }))))
      .addStringOption((o) => o.setName('modo').setDescription('Como ela usa esse poder').setRequired(true)
        .addChoices({ name: 'Automático (faz direto)', value: 'auto' }, { name: 'Pede confirmação (um clique)', value: 'confirma' }, { name: 'Desligado', value: 'off' })))
    .addSubcommand((s) => s.setName('delegar').setDescription('Deixa alguém mandar na sub dona (só o pai)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem passa a poder mandar').setRequired(true)))
    .addSubcommand((s) => s.setName('tirar').setDescription('Tira um delegado (só o pai)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem deixa de mandar').setRequired(true)))
    .addSubcommand((s) => s.setName('diario').setDescription('Tudo que a sub dona fez, com botão de desfazer'))
    .addSubcommand((s) => s.setName('recados').setDescription('Quem te procurou enquanto você esteve ausente')
      .addBooleanOption((o) => o.setName('limpar').setDescription('Apagar todos os recados? (só o pai)'))),

  async execute(interaction, client) {
    require('../subdona/publico').aplicar(interaction); // respostas ficam no canal, não somem
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    const sub = interaction.options.getSubcommand();
    const pai = await N.ehPai(client, interaction.user.id);
    const mandaTudo = await N.podeMandar(client, interaction.user.id); // pai e delegados mudam tudo...
    const podeVer = mandaTudo;

    const soPai = () => interaction.reply(UI.erro(pai || !mandaTudo ? 'Só o pai e os delegados mexem nisso.' : 'Isso é só do pai.'));

    if (sub === 'status') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      return interaction.reply({ ...(await Telas.telaStatus(client)), flags: UI.EPH });
    }

    if (sub === 'modo') { // ...menos ligar e desligar o modo sub dona: isso é só do pai
      if (!pai) return interaction.reply(UI.erro('Só o pai liga e desliga o modo sub dona.'));
      const ativo = interaction.options.getBoolean('ativo');
      N.setAtivo(ativo);
      return interaction.reply(UI.ok(ativo ? 'Modo sub dona **ligado**.' : 'Modo sub dona **desligado**. Nenhuma ordem, vigia, atendimento de ticket ou caixa funciona até você ligar de novo.'));
    }

    if (sub === 'panico') {
      if (!mandaTudo) return soPai();
      await interaction.deferReply({ flags: UI.EPH });
      const r = await Vigia.panico(interaction.guild, interaction.options.getBoolean('ativo'));
      return interaction.editReply(UI.edicao(UI.ok(r.trancados !== undefined ? `Pânico ligado: ${r.trancados} canais trancados.` : `Pânico desligado: ${r.abertos} canais destrancados.`)));
    }

    if (sub === 'alertas') {
      if (!mandaTudo) return soPai();
      const canal = interaction.options.getChannel('canal');
      N.setCfg('alertas', canal ? canal.id : null);
      return interaction.reply(UI.ok(canal ? `Os alertas vão para ${canal}.` : 'Os alertas vão para a sua DM.'));
    }

    if (sub === 'ticket') {
      if (!mandaTudo) return soPai();
      const m = interaction.options.getString('modo');
      N.setCfg('ticket', m);
      return interaction.reply(UI.ok({ ausente: 'Vou atender os tickets quando você estiver ausente.', sempre: 'Vou atender todos os tickets até a staff assumir.', off: 'Não atendo mais tickets.' }[m]));
    }

    if (sub === 'canais') {
      const acao = interaction.options.getString('acao'); const c = interaction.options.getChannel('canal');
      if (acao !== 'ver' && !c) return interaction.reply(UI.erro('Escolha o canal.'));
      if (acao === 'add') N.setCanaisLivres([...N.canaisLivres(), c.id]);
      if (acao === 'tirar') N.setCanaisLivres(N.canaisLivres().filter((x) => x !== c.id));
      const l = N.canaisLivres();
      return interaction.reply({ ...UI.ok(`${acao === 'add' ? `${c} agora é movimentado. ` : acao === 'tirar' ? `${c} voltou a ser vigiado. ` : ''}Canais movimentados: ${l.length ? l.map((i) => `<#${i}>`).join(' ') : 'nenhum'}.\nNesses canais não castigo flood nem repetição. Golpes e spam de menção continuam vigiados.`), allowedMentions: SEM_PING });
    }

    if (sub === 'raid') {
      if (!mandaTudo) return soPai();
      N.setCfg('raid_limite', interaction.options.getInteger('limite'));
      return interaction.reply(UI.ok(`Conto como raid ${interaction.options.getInteger('limite')} entradas em 1 minuto.`));
    }

    if (sub === 'ausente') {
      if (!mandaTudo) return soPai();
      const motivo = interaction.options.getString('motivo') || '';
      const horas = interaction.options.getInteger('horas');
      N.ausentar({ motivo, horas });
      const aviso = interaction.options.getChannel('canal');
      if (aviso) await aviso.send({ embeds: [UI.painel({ trilha: ['Sub dona'], titulo: 'O pai está ausente', descricao: `${motivo ? `${motivo}\n` : ''}${horas ? `Volta em cerca de ${horas} h.\n` : ''}Eu sou a sub dona e estou no comando. Quem precisar de algo pode falar comigo ou abrir um ticket.` })], allowedMentions: SEM_PING }).catch(() => {});
      return interaction.reply(UI.ok(`Combinado. Estou no comando${horas ? ` por ${horas} h` : ' até você voltar'}. Quem te marcar recebe resposta e eu anoto o recado. Use \`/subdona voltar\` quando voltar.`));
    }

    if (sub === 'voltar') {
      if (!mandaTudo) return soPai();
      const aus = N.ausencia();
      const desde = aus ? aus.desde : 0;
      const feitos = N.diario().filter((d) => d.em >= desde && d.ausencia);
      const rec = N.recados().length;
      N.voltar();
      const tela = Resumo.montar({ desde: desde || Date.now() - 24 * 3600 * 1000, titulo: aus ? 'Bem-vindo de volta. Isto é o que perdeu.' : 'Bem-vindo de volta', trilha: 'Ao voltar' });
      return interaction.reply({
        ...tela,
        components: [UI.botoes([{ id: 'sd:diarioa:0', label: `Ver o que fiz (${feitos.length})` }, { id: 'sd:recados:0', label: `Ver recados (${rec})` }])],
        flags: UI.EPH,
      });
    }

    if (sub === 'poder') {
      if (!mandaTudo) return soPai();
      const poder = interaction.options.getString('poder');
      const modo = interaction.options.getString('modo');
      N.setModo(poder, modo);
      return interaction.reply(UI.ok(`**${N.PODERES[poder].nome}**: ${N.MODOS[modo]}.`));
    }

    if (sub === 'delegar' || sub === 'tirar') {
      if (!mandaTudo) return soPai();
      const m = interaction.options.getUser('membro');
      if (m.bot) return interaction.reply(UI.erro('O delegado precisa ser uma pessoa.'));
      if (sub === 'delegar') N.delegar(m.id); else N.tirarDelegado(m.id);
      return interaction.reply({ ...UI.ok(sub === 'delegar' ? `${m} agora pode mandar na sub dona (dentro das permissões que ele já tem no Discord).` : `${m} não manda mais na sub dona.`), allowedMentions: SEM_PING });
    }

    if (sub === 'diario') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      return interaction.reply({ ...Telas.telaDiario(0), flags: UI.EPH });
    }

    if (sub === 'recados') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      if (interaction.options.getBoolean('limpar')) {
        if (!mandaTudo) return soPai();
        N.limparRecados();
        return interaction.reply(UI.ok('Recados apagados.'));
      }
      return interaction.reply({ ...Telas.telaRecados(0), flags: UI.EPH });
    }
  },
};
