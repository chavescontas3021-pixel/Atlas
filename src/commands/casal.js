const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../casamento/nucleo');
const UI = require('../ui/componentes');
const T = require('../ui/tema');

const MIN = 60 * 1000;
const ESPERA = 30 * MIN; // cada pessoa só dá um mimo a cada 30 minutos
const LIMITE_DIA = 8; // mimos que contam pontos por dia, por casal
const PTS_DIA = 10; // pontos por dia juntos
const PTS_MIMO = 2; // pontos por mimo contado

const MIMOS = {
  beijo: { emoji: '', nome: 'beijo', frases: ['deu um beijo carinhoso em', 'roubou um beijo de', 'encheu de beijinhos'] },
  abraco: { emoji: '', nome: 'abraço', frases: ['deu um abraço apertado em', 'abraçou bem forte', 'se aconchegou nos braços de'] },
  carinho: { emoji: '', nome: 'carinho', frases: ['fez um cafuné em', 'fez um carinho em', 'deu um dengo em'] },
};

const caminhoMimos = (id) => `casamento.mimos.${id}`;
const mimosDe = (id) => db.get(caminhoMimos(id), null) || { total: 0, hoje: { dia: '', n: 0 }, por: {}, cd: {} };
const diaBR = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10); // dia de Brasília (UTC-3)
const diasJuntos = (casal) => Math.max(0, Math.floor((Date.now() - casal.desde) / 86400000));
const pontos = (casal) => diasJuntos(casal) * PTS_DIA + mimosDe(casal.id).total * PTS_MIMO;
const fmtMin = (ms) => `${Math.ceil(ms / MIN)} min`;
const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];
const dataBR = (ms) => new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function embedCasal(casal) {
  const m = mimosDe(casal.id);
  const dias = diasJuntos(casal);
  const detalhe = Object.entries(MIMOS).map(([k, v]) => `${v.nome} ${m.por[k] || 0}`).join(`  ${T.S.sep}  `);
  return UI.painel({
    trilha: ['Casais'],
    titulo: `${dias} dia${dias === 1 ? '' : 's'} juntos`,
    descricao: `${N.mencao(casal.a)}  ${T.S.sep}  ${N.mencao(casal.b)}`,
    campos: [
      { nome: 'Casados desde', valor: dataBR(casal.desde), lado: true },
      { nome: 'Pontos', valor: `**${pontos(casal)}**`, lado: true },
      { nome: 'Mimos', valor: `**${m.total}**\n${T.S.filho} ${detalhe}` },
    ],
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casal')
    .setDescription('Casais da house: mimos e ranking')
    .addSubcommand((s) =>
      s
        .setName('mimo')
        .setDescription('Dá um mimo ao seu par (a cada 30 minutos)')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Qual mimo')
            .setRequired(true)
            .addChoices(...Object.entries(MIMOS).map(([k, v]) => ({ name: v.nome, value: k })))
        )
    )
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Mostra o casal de alguém')
        .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)'))
    )
    .addSubcommand((s) =>
      s
        .setName('ranking')
        .setDescription('Ranking dos casais')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('Como ordenar (padrão: geral)')
            .addChoices({ name: 'Geral (tempo + mimos)', value: 'geral' }, { name: 'Mais tempo juntos', value: 'tempo' }, { name: 'Mais mimos', value: 'mimos' })
        )
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply(UI.erro('Use este comando no servidor.'));
    const sub = interaction.options.getSubcommand();
    const eu = interaction.user.id;

    if (sub === 'ver') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const casal = N.casalDe(alvo.id);
      if (!casal) {
        return interaction.reply(UI.ok(alvo.id === eu ? 'Você não está casado(a).' : `${alvo.username} não está casado(a).`));
      }
      return interaction.reply({ embeds: [embedCasal(casal)], allowedMentions: { parse: [] } });
    }

    if (sub === 'ranking') {
      const tipo = interaction.options.getString('tipo') || 'geral';
      const casais = Object.values(N.casais());
      if (!casais.length) return interaction.reply(UI.ok('Ainda não há casais na house.'));
      const valor = { geral: pontos, tempo: (c) => diasJuntos(c), mimos: (c) => mimosDe(c.id).total }[tipo];
      const ordem = [...casais].sort((x, y) => valor(y) - valor(x) || x.desde - y.desde).slice(0, 10);
            const linhas = ordem.map((c, i) => {
        const resumo = tipo === 'tempo' ? `${diasJuntos(c)} dias juntos` : tipo === 'mimos' ? `${mimosDe(c.id).total} mimos` : `${pontos(c)} pts · ${diasJuntos(c)} dias · ${mimosDe(c.id).total} mimos`;
        return `**${String(i + 1).padStart(2, '0')}**  ${N.mencao(c.a)}  ${T.S.sep}  ${N.mencao(c.b)}\n${T.S.filho} ${resumo}`;
      });
      const titulo = { geral: 'Ranking dos casais', tempo: 'Casais mais antigos', mimos: 'Casais mais carinhosos' }[tipo];
      return interaction.reply({
        embeds: [UI.painel({ trilha: ['Casais', 'Ranking'], titulo, descricao: linhas.join('\n\n'), rodape: `${PTS_DIA} pts por dia juntos  ·  ${PTS_MIMO} pts por mimo (até ${LIMITE_DIA} por dia)` })],
        allowedMentions: { parse: [] },
      });
    }

    // ---------- Mimo ----------
    const casal = N.casalDe(eu);
    if (!casal) return interaction.reply(UI.erro('Só quem é casado(a) pode dar mimos de casal.'));
    const par = casal.a === eu ? casal.b : casal.a;
    const m = mimosDe(casal.id);
    const agora = Date.now();
    const falta = (m.cd[eu] || 0) + ESPERA - agora;
    if (falta > 0) {
      return interaction.reply(UI.erro(`Calma, apaixonado(a). Seu próximo mimo é daqui a ${fmtMin(falta)}.`));
    }

    const tipo = interaction.options.getString('tipo');
    const info = MIMOS[tipo];
    const hoje = diaBR();
    if (m.hoje.dia !== hoje) m.hoje = { dia: hoje, n: 0 };
    const conta = m.hoje.n < LIMITE_DIA;
    m.cd[eu] = agora;
    if (conta) {
      m.hoje.n++;
      m.total++;
      m.por[tipo] = (m.por[tipo] || 0) + 1;
    }
    db.set(caminhoMimos(casal.id), m);

    const nota = conta
      ? `Mimos de hoje que contam: ${m.hoje.n}/${LIMITE_DIA}`
      : `Vocês já bateram o limite de ${LIMITE_DIA} mimos que contam hoje, mas o carinho continua valendo.`;
    return interaction.reply({
      content: N.mencao(par),
      allowedMentions: { users: [par] },
      embeds: [UI.painel({ trilha: ['Casais', info.nome], descricao: `${N.mencao(eu)} ${sorteia(info.frases)} ${N.mencao(par)}`, rodape: nota })],
    });
  },
};
