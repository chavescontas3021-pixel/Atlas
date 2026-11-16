const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../subdona/nucleo');
const R = require('../subdona/rotinas');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');

const DIA = 24 * 3600 * 1000;
const DUR = (o) => o.setName('duracao_horas').setDescription('Duração em horas').setRequired(true).setMinValue(1).setMaxValue(720);

// Opções de agenda, sempre depois das obrigatórias
function agenda(s) {
  return s
    .addStringOption((o) => o.setName('repete').setDescription('Com que frequência (padrão: todo dia)')
      .addChoices({ name: 'Todo dia', value: 'diario' }, { name: 'Toda semana', value: 'semanal' }, { name: 'Uma vez só', value: 'uma_vez' }))
    .addIntegerOption((o) => o.setName('hora').setDescription('Hora de Brasília (0 a 23, padrão 12)').setMinValue(0).setMaxValue(23))
    .addIntegerOption((o) => o.setName('dia').setDescription('Dia da semana, se for semanal (padrão: segunda)')
      .addChoices(...R.DIAS_SEMANA.map((n, i) => ({ name: n, value: i }))))
    .addIntegerOption((o) => o.setName('em_horas').setDescription('Se for "uma vez só": daqui a quantas horas').setMinValue(1).setMaxValue(720));
}
const canal = (o) => o.setName('canal').setDescription('Onde postar').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true);
const ping = (o) => o.setName('mencionar').setDescription('Cargo para mencionar');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rotina')
    .setDescription('Sub dona: tarefas automáticas (pai e delegados)')
    .addSubcommand((s) => agenda(s.setName('anuncio').setDescription('Posta um aviso sozinha')
      .addChannelOption(canal).addStringOption((o) => o.setName('texto').setDescription('O aviso').setRequired(true).setMaxLength(1500)).addRoleOption(ping)))
    .addSubcommand((s) => agenda(s.setName('sorteio').setDescription('Cria sorteios sozinha')
      .addChannelOption(canal).addStringOption((o) => o.setName('premio').setDescription('O prêmio').setRequired(true).setMaxLength(100))
      .addIntegerOption(DUR).addIntegerOption((o) => o.setName('vencedores').setDescription('Quantos vencedores (padrão 1)').setMinValue(1).setMaxValue(10)).addRoleOption(ping)))
    .addSubcommand((s) => agenda(s.setName('evento').setDescription('Cria eventos sozinha')
      .addChannelOption(canal).addStringOption((o) => o.setName('titulo').setDescription('Nome do evento').setRequired(true).setMaxLength(100))
      .addIntegerOption((o) => o.setName('comeca_em_horas').setDescription('O evento começa quantas horas depois de criado').setRequired(true).setMinValue(1).setMaxValue(720))
      .addStringOption((o) => o.setName('descricao').setDescription('Detalhes').setMaxLength(500)).addRoleOption(ping)))
    .addSubcommand((s) => s.setName('inativos').setDescription('Dá um cargo a quem some e tira de quem volta')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo de inativo').setRequired(true))
      .addIntegerOption((o) => o.setName('dias').setDescription('Dias sem falar (7 a 90)').setRequired(true).setMinValue(7).setMaxValue(90))
      .addIntegerOption((o) => o.setName('hora').setDescription('Hora de Brasília (padrão 4)').setMinValue(0).setMaxValue(23)))
    .addSubcommand((s) => s.setName('tempo').setDescription('Dá um cargo a quem completa X dias no servidor')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo a dar').setRequired(true))
      .addIntegerOption((o) => o.setName('dias').setDescription('Dias de casa').setRequired(true).setMinValue(1).setMaxValue(3650))
      .addIntegerOption((o) => o.setName('hora').setDescription('Hora de Brasília (padrão 4)').setMinValue(0).setMaxValue(23)))
    .addSubcommand((s) => s.setName('entrada').setDescription('Dá um cargo a todo mundo que entrar')
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo a dar').setRequired(true)))
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra as rotinas'))
    .addSubcommand((s) => s.setName('pausar').setDescription('Pausa ou retoma uma rotina')
      .addIntegerOption((o) => o.setName('id').setDescription('Número da rotina').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('remover').setDescription('Apaga uma rotina')
      .addIntegerOption((o) => o.setName('id').setDescription('Número da rotina').setRequired(true).setMinValue(1))),

  async execute(interaction, client) {
    require('../subdona/publico').aplicar(interaction); // respostas ficam no canal, não somem
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    if (!(await N.podeMandar(client, interaction.user.id))) return interaction.reply(UI.erro('Isso é só do pai e dos delegados.'));
    const sub = interaction.options.getSubcommand();
    const g = (n) => interaction.options.getString(n);
    const i = (n) => interaction.options.getInteger(n);
    const guildId = interaction.guildId;

    if (sub === 'listar') {
      const l = R.lista().filter((r) => !r.guildId || r.guildId === guildId);
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Sub dona', 'Rotinas'], titulo: `${l.length} rotina(s)`, descricao: l.length ? l.map(R.descrever).join('\n\n').slice(0, 3900) : 'Nenhuma ainda. Crie com `/rotina anuncio`, `/rotina sorteio`, `/rotina inativos`...' })], flags: UI.EPH, allowedMentions: { parse: [] } });
    }
    if (sub === 'remover') return interaction.reply(R.remover(i('id')) ? UI.ok(`Rotina #${i('id')} apagada.`) : UI.erro('Não achei essa rotina.'));
    if (sub === 'pausar') {
      const r = R.alternar(i('id'));
      return interaction.reply(r ? UI.ok(`Rotina #${r.id} ${r.ativa ? 'retomada' : 'pausada'}.`) : UI.erro('Não achei essa rotina.'));
    }

    let dados;
    if (['anuncio', 'sorteio', 'evento'].includes(sub)) {
      const repete = g('repete') || 'diario';
      const ag = { repete, hora: i('hora') ?? 12, dia: i('dia') ?? 1 };
      if (repete === 'uma_vez') {
        if (!i('em_horas')) return interaction.reply(UI.erro('Para "uma vez só", diga daqui a quantas horas em `em_horas`.'));
        ag.quando = Date.now() + i('em_horas') * 3600 * 1000;
      }
      const c = interaction.options.getChannel('canal');
      const m = interaction.options.getRole('mencionar');
      const base = { tipo: sub, guildId, canalId: c.id, cargoPing: m ? m.id : null, ...ag };
      if (sub === 'anuncio') dados = { ...base, texto: g('texto') };
      if (sub === 'sorteio') dados = { ...base, premio: g('premio'), duracaoMs: i('duracao_horas') * 3600 * 1000, vencedores: i('vencedores') || 1 };
      if (sub === 'evento') dados = { ...base, titulo: g('titulo'), descricao: g('descricao') || '', depoisMs: i('comeca_em_horas') * 3600 * 1000 };
    } else if (sub === 'inativos' || sub === 'tempo') {
      const c = interaction.options.getRole('cargo');
      dados = { tipo: sub === 'tempo' ? 'cargo_tempo' : 'inativos', guildId, cargoId: c.id, dias: i('dias'), repete: 'diario', hora: i('hora') ?? 4 };
    } else if (sub === 'entrada') {
      dados = { tipo: 'cargo_entrada', guildId, cargoId: interaction.options.getRole('cargo').id, repete: 'entrada' };
    }
    const r = R.criar(dados);
    if (r.erro) return interaction.reply(UI.erro(r.erro));
    const aviso = ['inativos', 'cargo_tempo', 'cargo_entrada'].includes(dados.tipo) && N.modo('cargo') === 'off' ? `\n${S.filho} O poder **Cargos** está desligado. Ligue em \`/subdona poder\`.` : ['anuncio', 'sorteio', 'evento'].includes(dados.tipo) && N.modo('anunciar') === 'off' ? `\n${S.filho} O poder **Anunciar** está desligado. Ligue em \`/subdona poder\`.` : '';
    return interaction.reply({ ...UI.ok(`Rotina criada:\n${R.descrever(r.rotina)}${aviso}`), allowedMentions: { parse: [] } });
  },
};
