const db = require('../db');
const UI = require('../ui/componentes');
const B = require('../blacklist/nucleo');
const N = require('./nucleo');

const SEM_PING = { parse: [] };
const MAX_RESPOSTAS = 6;
const ultimaResposta = new Map();

const URGENTE = /(urgente|ameaca|ameacou|ameacando|hacke(ou|aram|ado)|invadiram|roubaram|golpe|fui enganad|vazou|vazaram|nudes|menor de idade|assedi|stalker|perseguind)/;
const CRISE = /(quero me matar|vou me matar|suicid|me machucar|nao quero mais viver|me cortar)/;

const ticketDe = (canalId) => require('../ticket/nucleo').ticketDoCanal(canalId);
const salvar = (t) => db.set(`ticket.abertos.${t.canalId}`, t);
const sem = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function ativoNeste() {
  if (!N.ativo()) return false;
  const m = N.ticketModo();
  return m === 'sempre' || (m === 'ausente' && !!N.ausencia());
}

async function chamarStaff(client, canal, t, motivo) {
  const T = require('../ticket/nucleo');
  const staff = T.staffRoles(canal.guild, T.painelDoTicket ? T.painelDoTicket(t) : null);
  const responsavel = await N.responsavelId(client);
  const pings = [...staff.map((id) => `<@&${id}>`), ...(N.ausencia() ? [] : (responsavel ? [`<@${responsavel}>`] : []))];
  await canal.send({
    content: `${pings.join(' ')} ${motivo}`.trim(),
    allowedMentions: { roles: staff, users: responsavel ? [responsavel] : [] },
  }).catch(() => {});
  t.chamou = Date.now();
  salvar(t);
}

function botoes() {
  return UI.botoes([{ id: 'sdt:chamar', label: 'Chamar a staff' }, { id: 'sdt:resolvido', label: 'Já resolvi' }]);
}

async function aoMensagem(client, msg) {
  if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId || msg.system) return;
  const t = ticketDe(msg.channelId);
  if (!t) return;
  const T = require('../ticket/nucleo');

  t.ultima = Date.now();
  if (msg.author.id !== t.userId && msg.member && T.ehStaff(msg.member, t)) {
    t.humano = true;
    salvar(t);
    return;
  }
  salvar(t);

  if (!ativoNeste() || t.humano || t.assumidoPor || msg.author.id !== t.userId) return;
  if (B.esta(msg.author.id)) return;
  if ((t.atlasRespostas || 0) >= MAX_RESPOSTAS) return;
  if (Date.now() - (ultimaResposta.get(msg.channelId) || 0) < 15000) return;
  ultimaResposta.set(msg.channelId, Date.now());

  const texto = String(msg.content || '').trim();
  if (!texto) return;
  const norm = sem(texto);
  const primeira = !t.atlasRespostas;
  let resposta = null;
  let urgente = false;

  if (CRISE.test(norm)) {
    resposta = 'Eu li o que você escreveu e me importo com você. Já chamei a staff agora. Se precisar conversar com alguém neste instante, o **CVV atende de graça pelo 188**, 24 horas. Se estiver em perigo, ligue **192** (SAMU).';
    urgente = true;
  } else if (URGENTE.test(norm)) {
    resposta = 'Entendi que isso é sério. Já avisei a staff com urgência. Enquanto ela não chega, escreva o que aconteceu com o máximo de detalhes: quem, quando, onde e prints.';
    urgente = true;
  } else {
    const K = require('./conhecimento');
    const kb = K.buscar(texto);
    if (kb) { resposta = kb.item.resposta; K.usou(kb.item.id); }
    if (!resposta && K.ehPergunta(texto)) K.anotarPendente(texto, msg.author.id);
    if (!resposta) {
      resposta = primeira
        ? `Oi, ${msg.member ? msg.member.displayName : 'tudo bem'}! Sou a Atlas, a sub dona, e estou atendendo enquanto a staff não chega. Anotei o seu pedido. Se tiver mais detalhes ou prints, pode mandar.`
        : 'Anotei. Se for urgente, use o botão **Chamar a staff**.';
    }
  }

  t.atlasRespostas = (t.atlasRespostas || 0) + 1;
  salvar(t);
  await msg.reply({ content: resposta.slice(0, 1800), components: primeira || urgente ? [botoes()] : [], allowedMentions: { repliedUser: false, parse: [] } }).catch(() => {});
  if (urgente) await chamarStaff(client, msg.channel, t, `Ticket com urgência (${msg.author}).`);
  else if (t.atlasRespostas >= MAX_RESPOSTAS) await msg.channel.send({ ...UI.nota('Já respondi o que pude. A staff vai continuar daqui.', 'ok', { publica: true }) }).catch(() => {});
}

async function aoClicar(interaction, client, acao) {
  const t = ticketDe(interaction.channelId);
  if (!t) return interaction.reply(UI.erro('Este canal não é um ticket aberto.'));
  const T = require('../ticket/nucleo');
  const dono = interaction.user.id === t.userId;
  const staff = interaction.member && T.ehStaff(interaction.member, t);
  if (!dono && !staff) return interaction.reply(UI.erro('Só quem abriu o ticket e a staff usam isso.'));

  if (acao === 'chamar') {
    await interaction.deferUpdate();
    return chamarStaff(client, interaction.channel, t, `${interaction.user} pediu atendimento da staff.`);
  }
  if (acao === 'resolvido' || acao === 'fechar') {
    await interaction.deferUpdate();
    await interaction.channel.send({ ...UI.ok('Que bom que resolveu! Vou fechar o ticket e mandar a transcrição para você.', { publica: true }) }).catch(() => {});
    return require('../ticket/fluxo').encerrar(interaction.guild, interaction.channel, interaction.user, 'Resolvido (atendimento da Atlas)');
  }
  if (acao === 'ainda') {
    await interaction.update({ ...UI.edicao(UI.ok('Certo, o ticket continua aberto.', { publica: true })), components: [] });
    t.avisoInativo = null; t.ultima = Date.now(); salvar(t);
  }
}

module.exports = { aoMensagem, aoClicar, chamarStaff, ativoNeste, salvar, _teste: { URGENTE, CRISE, ultimaResposta } };
