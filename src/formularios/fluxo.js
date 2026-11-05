// Formulários de staff:
//  - candidato: /formulario {área} (funciona em qualquer conversa privada) -> botão -> janelas com as perguntas
//  - staff: /formularios entregues -> escolhe a área e o formulário -> aprova ou reprova (o candidato recebe a decisão por mensagem privada)
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder,
  StringSelectMenuBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const M = require('./modelos');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const eph = (interaction) => (interaction.inGuild() ? { flags: EPH } : {});
const servidor = (client) => client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first() || null;

// ---------- Armazenamento ----------
const todos = () => {
  const o = db.get('formularios.entregues', {});
  return o && typeof o === 'object' ? o : {};
};
const obter = (id) => todos()[id] || null;
const salvar = (f) => db.set(`formularios.entregues.${f.id}`, f);
function novoId() {
  const n = (Number(db.get('formularios.contador', 0)) || 0) + 1;
  db.set('formularios.contador', n);
  return `f${n}`;
}
const doTipo = (tipo) => Object.values(todos()).filter((f) => f.tipo === tipo);
const chaveRascunho = (uid) => `formularios.rascunhos.${uid}`;
const STATUS = { pendente: 'Pendente', aprovado: 'Aprovado', reprovado: 'Reprovado' };

// ======================================================================
// CANDIDATO
// ======================================================================

// Pode responder? Precisa estar no servidor e não ter um formulário igual em análise (ou já aprovado).
async function podeResponder(client, user, tipo) {
  const guild = servidor(client);
  if (!guild) return { erro: 'Não encontrei o servidor. Avise a equipe.' };
  const membro = await guild.members.fetch(user.id).catch(() => null);
  if (!membro) return { erro: `Você precisa estar no servidor ${guild.name} para enviar um formulário.` };
  const area = M.AREAS[tipo];
  const meus = doTipo(tipo).filter((f) => f.userId === user.id);
  if (meus.some((f) => f.status === 'pendente')) {
    return { erro: `Você já tem um formulário de ${area.nome} em análise. Aguarde a decisão da equipe.` };
  }
  if (meus.some((f) => f.status === 'aprovado')) {
    return { erro: `O seu formulário de ${area.nome} já foi aprovado.` };
  }
  return { guild, membro };
}

const contarPerguntas = (area) => area.paginas.reduce((n, p) => n + p.length, 0);

// A mensagem do formulário, enviada na conversa
function embedFormulario(tipo) {
  const area = M.AREAS[tipo];
  let numero = 0;
  const lista = area.paginas
    .map((pagina, i) => {
      const linhas = pagina.map((q) => `${++numero}. ${q.pergunta}`).join('\n');
      return area.paginas.length > 1 ? `Parte ${i + 1} de ${area.paginas.length}\n${linhas}` : linhas;
    })
    .join('\n\n');

  const instrucao =
    'Como responder: clique no botão "Responder formulário" abaixo. Uma janela vai abrir com as perguntas; ' +
    'preencha e envie.' +
    (area.paginas.length > 1
      ? ' Este formulário tem mais de uma parte: depois de enviar cada parte, aparece um botão para continuar.'
      : '') +
    ' Responda com atenção e sinceridade. Quando terminar, o formulário fica em análise e você será avisado aqui, ' +
    'por mensagem privada, sobre a decisão.';

  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(`Formulário de ${area.nome}`)
    .setDescription(`${area.intro}\n\nPerguntas (${contarPerguntas(area)}):\n${lista}\n\n${instrucao}`.slice(0, 4096));
}

const botaoResponder = (tipo) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`form:ini:${tipo}`).setLabel('Responder formulário').setStyle(ButtonStyle.Primary)
  );

// /formulario {tipo}
async function comando(interaction) {
  const tipo = interaction.options.getString('tipo');
  if (!M.AREAS[tipo]) return interaction.reply({ content: 'Área inválida.', ...eph(interaction) });
  const p = await podeResponder(interaction.client, interaction.user, tipo);
  if (p.erro) return interaction.reply({ content: p.erro, ...eph(interaction) });
  return interaction.reply({ embeds: [embedFormulario(tipo)], components: [botaoResponder(tipo)], ...eph(interaction) });
}

// Janela com as perguntas de uma parte
function janela(tipo, n) {
  const area = M.AREAS[tipo];
  const pagina = area.paginas[n];
  const antes = area.paginas.slice(0, n).reduce((soma, p) => soma + p.length, 0);
  const titulo = area.paginas.length > 1
    ? `Formulário de ${area.nome} (${n + 1}/${area.paginas.length})`
    : `Formulário de ${area.nome}`;
  const modal = new ModalBuilder().setCustomId(`form:modal:${tipo}:${n}`).setTitle(titulo.slice(0, 45));
  pagina.forEach((q, i) => {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(`${antes + i + 1}. ${q.curto}`.slice(0, 45))
          .setPlaceholder(q.dica)
          .setStyle(q.longo ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setMinLength(q.min)
          .setMaxLength(q.max)
          .setRequired(true)
      )
    );
  });
  return modal;
}

// Botão "Responder formulário": começa do zero
async function iniciar(interaction, tipo) {
  if (!M.AREAS[tipo]) return interaction.reply({ content: 'Área inválida.', ...eph(interaction) });
  const p = await podeResponder(interaction.client, interaction.user, tipo);
  if (p.erro) return interaction.reply({ content: p.erro, ...eph(interaction) });
  db.set(chaveRascunho(interaction.user.id), { tipo, proxima: 0, respostas: {}, inicio: Date.now() });
  return interaction.showModal(janela(tipo, 0));
}

// Botão "Continuar": abre a próxima parte
async function continuar(interaction, tipo, n) {
  const rasc = db.get(chaveRascunho(interaction.user.id));
  if (!M.AREAS[tipo] || !rasc || rasc.tipo !== tipo || rasc.proxima !== n) {
    return interaction.reply({ content: 'Esta parte do formulário não está mais disponível. Use /formulario para começar de novo.', ...eph(interaction) });
  }
  return interaction.showModal(janela(tipo, n));
}

const enviando = new Set(); // um envio por vez para cada pessoa

// Janela enviada: guarda a parte e segue; na última parte, entrega o formulário
async function receberParte(interaction, tipo, n) {
  const resp = (content, extra = {}) => interaction.reply({ content, ...extra, ...eph(interaction) });
  const area = M.AREAS[tipo];
  const uid = interaction.user.id;
  const rasc = db.get(chaveRascunho(uid));
  if (!area || !rasc || rasc.tipo !== tipo || rasc.proxima !== n) {
    return resp('Esta parte do formulário não está mais disponível. Use /formulario para começar de novo.');
  }

  for (const q of area.paginas[n]) {
    rasc.respostas[q.id] = interaction.fields.getTextInputValue(q.id).trim();
  }
  rasc.proxima = n + 1;
  db.set(chaveRascunho(uid), rasc);

  // Ainda tem parte para responder
  if (n + 1 < area.paginas.length) {
    const botao = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`form:pag:${tipo}:${n + 1}`).setLabel(`Continuar (parte ${n + 2} de ${area.paginas.length})`).setStyle(ButtonStyle.Primary)
    );
    return resp(`Parte ${n + 1} de ${area.paginas.length} recebida. Clique no botão abaixo para continuar.`, { components: [botao] });
  }

  // Última parte: entrega
  if (enviando.has(uid)) return resp('Já estou registrando o seu formulário. Aguarde um instante.');
  enviando.add(uid);
  try {
    const p = await podeResponder(interaction.client, interaction.user, tipo);
    if (p.erro) return resp(p.erro);
    const perguntas = area.paginas.flat();
    const f = {
      id: novoId(),
      tipo,
      userId: uid,
      usuario: interaction.user.username,
      nome: p.membro.displayName,
      enviadoEm: Date.now(),
      status: 'pendente',
      respostas: perguntas.map((q) => ({ pergunta: q.pergunta, resposta: rasc.respostas[q.id] || '' })),
    };
    salvar(f);
    db.remover(chaveRascunho(uid));
    return resp(
      `O seu formulário de ${area.nome} foi enviado e está em análise pela equipe. ` +
        'Você será avisado aqui, por mensagem privada, quando houver uma decisão.'
    );
  } finally {
    enviando.delete(uid);
  }
}

// ======================================================================
// STAFF
// ======================================================================
const dataHora = (ms) => `<t:${Math.floor(ms / 1000)}:f>`;

function contagem(tipo) {
  const lista = doTipo(tipo);
  const c = { total: lista.length, pendente: 0, aprovado: 0, reprovado: 0 };
  for (const f of lista) c[f.status] = (c[f.status] || 0) + 1;
  return c;
}

// Tela inicial: quantos formulários de cada área
function telaResumo() {
  const areas = Object.entries(M.AREAS);
  const linhas = areas.map(([tipo, area]) => {
    const c = contagem(tipo);
    return `${area.nome}: ${c.total} ${c.total === 1 ? 'formulário' : 'formulários'} (${c.pendente} pendente(s), ${c.aprovado} aprovado(s), ${c.reprovado} reprovado(s))`;
  });
  const total = areas.reduce((soma, [tipo]) => soma + contagem(tipo).total, 0);
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('Formulários entregues')
    .setDescription(total ? `${linhas.join('\n')}\n\nEscolha uma área para ver os formulários.` : 'Nenhum formulário foi entregue ainda.');
  const botoes = areas.map(([tipo, area]) =>
    new ButtonBuilder()
      .setCustomId(`formadm:tipo:${tipo}`)
      .setLabel(`${area.nome} (${contagem(tipo).total})`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(contagem(tipo).total === 0)
  );
  return { content: '', embeds: [embed], components: [new ActionRowBuilder().addComponents(botoes)] };
}

// Lista de uma área: menu para escolher qual formulário abrir
function telaLista(tipo) {
  const area = M.AREAS[tipo];
  const c = contagem(tipo);
  // Pendentes primeiro; dentro de cada grupo, os mais recentes
  const ordem = { pendente: 0, aprovado: 1, reprovado: 2 };
  const lista = doTipo(tipo).sort((a, b) => ordem[a.status] - ordem[b.status] || b.enviadoEm - a.enviadoEm);
  const mostrados = lista.slice(0, 25);

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`Formulários de ${area.nome}`)
    .setDescription(
      `${c.total} ${c.total === 1 ? 'pessoa fez' : 'pessoas fizeram'} este formulário: ` +
        `${c.pendente} pendente(s), ${c.aprovado} aprovado(s) e ${c.reprovado} reprovado(s).` +
        (lista.length > 25 ? '\nMostrando os 25 primeiros (pendentes primeiro).' : '') +
        '\n\nEscolha um formulário no menu abaixo para abrir.'
    );
  const componentes = [];
  if (mostrados.length) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`formadm:sel:${tipo}`)
      .setPlaceholder('Escolha um formulário')
      .addOptions(
        mostrados.map((f) => ({
          label: `${f.nome || f.usuario} - ${STATUS[f.status]}`.slice(0, 100),
          description: `Enviado em ${new Date(f.enviadoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`.slice(0, 100),
          value: f.id,
        }))
      );
    componentes.push(new ActionRowBuilder().addComponents(menu));
  }
  componentes.push(
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('formadm:inicio').setLabel('Voltar').setStyle(ButtonStyle.Secondary))
  );
  return { content: '', embeds: [embed], components: componentes };
}

// Divide as respostas em páginas que cabem em um embed
function paginar(f) {
  const blocos = f.respostas.map((r, i) => `**${i + 1}. ${r.pergunta}**\n${r.resposta || '(sem resposta)'}`);
  const paginas = [];
  let atual = '';
  for (const b of blocos) {
    const bloco = b.length > 3400 ? `${b.slice(0, 3397)}...` : b;
    if (atual && atual.length + bloco.length + 2 > 3400) {
      paginas.push(atual);
      atual = '';
    }
    atual += (atual ? '\n\n' : '') + bloco;
  }
  if (atual) paginas.push(atual);
  return paginas.length ? paginas : ['(sem respostas)'];
}

// Um formulário aberto, com as respostas e os botões de decisão
function telaFormulario(f, n = 0, aviso = '') {
  const area = M.AREAS[f.tipo];
  const paginas = paginar(f);
  const pag = Math.max(0, Math.min(n, paginas.length - 1));
  let cab =
    `Candidato: <@${f.userId}> (${f.nome || f.usuario})\n` +
    `Enviado: ${dataHora(f.enviadoEm)}\n` +
    `Situação: ${STATUS[f.status]}`;
  if (f.status !== 'pendente') cab += ` por <@${f.decididoPor}> em ${dataHora(f.decididoEm)}`;

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(`Formulário de ${area.nome} (${f.id})`)
    .setDescription(`${cab}\n\n${paginas[pag]}`.slice(0, 4096))
    .setFooter({ text: `Página ${pag + 1} de ${paginas.length}` });

  const linhas = [];
  if (paginas.length > 1) {
    linhas.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`formadm:pg:${f.id}:${pag - 1}`).setLabel('Anterior').setStyle(ButtonStyle.Secondary).setDisabled(pag === 0),
        new ButtonBuilder().setCustomId(`formadm:pg:${f.id}:${pag + 1}`).setLabel('Próxima').setStyle(ButtonStyle.Secondary).setDisabled(pag === paginas.length - 1)
      )
    );
  }
  linhas.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`formadm:ap:${f.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success).setDisabled(f.status !== 'pendente'),
      new ButtonBuilder().setCustomId(`formadm:rp:${f.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger).setDisabled(f.status !== 'pendente'),
      new ButtonBuilder().setCustomId(`formadm:tipo:${f.tipo}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary)
    )
  );
  return { content: aviso, embeds: [embed], components: linhas };
}

// /formularios entregues
async function comandoEntregues(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use este comando no servidor.', flags: EPH });
  return interaction.reply({ ...telaResumo(), flags: EPH });
}

async function decidir(interaction, id, aprovar) {
  const f = obter(id);
  if (!f) return interaction.update({ content: 'Esse formulário não existe mais.', embeds: [], components: [] });
  if (f.status !== 'pendente') return interaction.update(telaFormulario(f, 0, 'Esse formulário já foi decidido.'));

  f.status = aprovar ? 'aprovado' : 'reprovado';
  f.decididoPor = interaction.user.id;
  f.decididoEm = Date.now();
  salvar(f);

  // Avisa o candidato por mensagem privada
  const area = M.AREAS[f.tipo];
  let enviou = true;
  try {
    const user = await interaction.client.users.fetch(f.userId);
    await user.send({ content: (aprovar ? M.TEXTOS.aprovado : M.TEXTOS.reprovado)(area.nome) });
  } catch {
    enviou = false;
  }
  const aviso = enviou
    ? `Decisão registrada (${STATUS[f.status].toLowerCase()}) e enviada ao candidato por mensagem privada.`
    : `Decisão registrada (${STATUS[f.status].toLowerCase()}), mas não consegui enviar a mensagem privada ao candidato. Avise-o por outro meio.`;
  return interaction.update(telaFormulario(f, 0, aviso));
}

// Botões e menu "formadm:" (só a staff recebe essas mensagens, que são privadas)
async function painelStaff(interaction) {
  if (!interaction.inGuild()) return interaction.reply({ content: 'Use este comando no servidor.', flags: EPH });
  const [, acao, a, b] = interaction.customId.split(':');

  if (acao === 'inicio') return interaction.update(telaResumo());
  if (acao === 'tipo') {
    if (!M.AREAS[a]) return interaction.update(telaResumo());
    return interaction.update(telaLista(a));
  }
  if (acao === 'sel') {
    const f = obter(interaction.values[0]);
    if (!f) return interaction.update(telaLista(a));
    return interaction.update(telaFormulario(f, 0));
  }
  if (acao === 'pg') {
    const f = obter(a);
    if (!f) return interaction.update(telaResumo());
    return interaction.update(telaFormulario(f, Number(b) || 0));
  }
  if (acao === 'ap') return decidir(interaction, a, true);
  if (acao === 'rp') return decidir(interaction, a, false);
  return undefined;
}

module.exports = {
  comando, comandoEntregues, iniciar, continuar, receberParte, painelStaff,
  embedFormulario, janela, telaResumo, telaLista, telaFormulario, paginar,
};
