const {
  ActionRowBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const UI = require('../ui/componentes');
const T = require('../ui/tema');
const db = require('../db');
const Acesso = require('../utils/acesso');

// Tudo em preto do Atlas; vermelho só para banimento.
const COR = { aviso: T.COR.base, ban: T.COR.perigo, kick: T.COR.base, ok: T.COR.base };

const PADROES = {
  limite: 3,
  mensagens: {
    dmAviso: {
      titulo: 'Você recebeu um aviso',
      texto:
        'Você recebeu um aviso em **{servidor}**.\n\n**Motivo:** {motivo}\n**Regra:** {regra}\n' +
        '**Avisos:** {avisos}/{limite}\n\nAo chegar em {limite} avisos, você será banido(a).',
    },
    dmBan: {
      titulo: 'Você foi banido(a)',
      texto: 'Você foi banido(a) de **{servidor}**.\n\n**Motivo:** {motivo}',
    },
    dmExpulsao: {
      titulo: 'Você foi expulso(a)',
      texto: 'Você foi expulso(a) de **{servidor}**.\n\n**Motivo:** {motivo}',
    },
  },
};

function cfg(chave, padrao) {
  return db.get(`config.moderacao.${chave}`, padrao);
}

const limite = () => Number(cfg('limite', PADROES.limite));

function regras() {
  const r = cfg('regras');
  return Array.isArray(r) ? r : [];
}

function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

function avisosDe(userId) {
  const lista = db.get(`moderacao.avisos.${userId}`, []);
  return Array.isArray(lista) ? [...lista] : [];
}

function salvarAvisos(userId, lista) {
  if (lista.length) db.set(`moderacao.avisos.${userId}`, lista);
  else db.remover(`moderacao.avisos.${userId}`);
}

function proximoId() {
  const n = db.get('moderacao.contador', 0) + 1;
  db.set('moderacao.contador', n);
  return n;
}

// Retorna um texto de erro, ou null se pode agir
function checarHierarquia(executor, alvo) {
  const guild = alvo.guild;
  if (alvo.id === executor.id) return 'Você não pode fazer isso consigo mesmo.';
  if (alvo.id === guild.ownerId) return 'Não dá para fazer isso com o dono do servidor.';
  if (alvo.id === guild.client.user.id) return 'Eu não vou fazer isso comigo.';
  if (executor.id !== guild.ownerId && alvo.roles.highest.position >= executor.roles.highest.position) {
    return 'Esse membro tem um cargo igual ou acima do seu.';
  }
  return null;
}

async function enviarDM(user, tipo, vars) {
  const msg = mensagem(tipo);
  const embed = UI.painel({
    trilha: [vars.servidor],
    titulo: preencher(msg.titulo, vars),
    descricao: preencher(msg.texto, vars),
    perigo: tipo === 'dmBan',
  }).setTimestamp();
  try {
    await user.send({ embeds: [embed] });
    return true;
  } catch (e) {
    return false;
  }
}

function varsBase(guild, motivo) {
  return { servidor: guild.name, motivo, regra: 'não informada', avisos: '', limite: String(limite()) };
}

// Manda um registro no canal de log
async function registrar(guild, { titulo, cor, alvo, executor, motivo, extras = [] }) {
  const id = cfg('canalLog');
  if (!id) return;
  const canal = guild.channels.cache.get(id);
  if (!canal) return;

  const embed = UI.painel({
    trilha: ['Moderação'],
    titulo,
    perigo: cor === COR.ban,
    campos: [
      { nome: 'Membro', valor: `<@${alvo.id}>  ${T.S.sep}  \`${alvo.tag || alvo.username}\``, lado: true },
      { nome: 'Por', valor: `<@${executor.id}>`, lado: true },
      { nome: 'Motivo', valor: String(motivo).slice(0, 1024) || '—' },
      ...extras.map((x) => ({ nome: x.name, valor: x.value, lado: x.inline })),
    ],
  }).setTimestamp();
  await canal.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch((e) => console.error('[Moderação] log:', e.message));
}

async function banir(guild, executor, user, membro, motivo, apagarSeg = 0) {
  let dm = false;
  if (membro) dm = await enviarDM(user, 'dmBan', varsBase(guild, motivo));
  try {
    await guild.members.ban(user.id, {
      reason: `${motivo} | por ${executor.tag}`.slice(0, 512),
      deleteMessageSeconds: apagarSeg,
    });
  } catch (erro) {
    return { ok: false, erro: erro.message, dm };
  }
  await registrar(guild, { titulo: 'Banimento', cor: COR.ban, alvo: user, executor, motivo });
  return { ok: true, dm };
}

async function expulsar(guild, executor, membro, motivo) {
  const dm = await enviarDM(membro.user, 'dmExpulsao', varsBase(guild, motivo));
  try {
    await membro.kick(`${motivo} | por ${executor.tag}`.slice(0, 512));
  } catch (erro) {
    return { ok: false, erro: erro.message, dm };
  }
  await registrar(guild, { titulo: 'Expulsão', cor: COR.kick, alvo: membro.user, executor, motivo });
  return { ok: true, dm };
}

async function desbanir(guild, executor, id, motivo) {
  try {
    const user = await guild.members.unban(id, `${motivo} | por ${executor.tag}`.slice(0, 512));
    await registrar(guild, { titulo: 'Desbanimento', cor: COR.ok, alvo: user, executor, motivo });
    return { ok: true, user };
  } catch (erro) {
    return { ok: false, erro: erro.message };
  }
}

// ---------- Advertência no canal de divergências ----------
// Canal onde a advertência vira mensagem pública + tópico (/moderacao canaladvertencia)
const canalAdvertencia = () => cfg('canalAdvertencia', null);

// Staff do tópico: quem pode avisar membros (Moderar Membros) ou é staff do Atlas
const ehStaffTopico = (membro) =>
  !!membro && (Acesso.ehStaff(membro) || (membro.permissions && membro.permissions.has(PermissionFlagsBits.ModerateMembers)));

// Mensagem no canal: marca o membro, mostra o motivo e manda questionar no tópico logo abaixo
async function anunciarNoCanal(canal, membro, motivo, regraTexto, total, lim) {
  const campos = [{ nome: 'Motivo', valor: motivo }];
  if (regraTexto) campos.push({ nome: 'Regra', valor: regraTexto });
  campos.push({ nome: 'Advertências', valor: `${T.barra(total / lim, lim)}  ${total}/${lim}` });
  const embed = UI.painel({
    trilha: ['Advertência'],
    titulo: 'Você recebeu uma advertência',
    descricao: 'Se tiver algo a questionar, escreva no **tópico logo abaixo**.',
    campos,
  });
  return canal.send({
    content: `<@${membro.id}>`,
    embeds: [embed],
    allowedMentions: { users: [membro.id] },
  });
}

// Tópico logo abaixo da mensagem: só o membro e a staff escrevem (o resto é apagado pelo Atlas)
async function criarTopico(msg, executor, membro) {
  const nome = `Advertência · ${membro.user.username}`.slice(0, 100);
  const motivo = `Advertência de ${membro.user.tag} por ${executor.tag}`.slice(0, 500);
  let topico;
  try {
    topico = await msg.startThread({ name: nome, autoArchiveDuration: 10080, reason: motivo });
  } catch (e) {
    topico = await msg.startThread({ name: nome, reason: motivo });
  }
  db.set(`moderacao.topicos.${topico.id}`, { membro: membro.id, por: executor.id, em: Date.now() });
  await topico.members.add(membro.id).catch(() => {});
  await topico.members.add(executor.id).catch(() => {});
  return topico;
}

// opcoes.canal: se vier, a advertência sai nesse canal (sem DM) e ganha um tópico
async function darAviso(guild, executor, membro, motivo, numeroRegra, opcoes = {}) {
  const todas = regras();
  const regraTexto = numeroRegra && todas[numeroRegra - 1] ? `${numeroRegra}. ${todas[numeroRegra - 1]}` : null;

  const lista = avisosDe(membro.id);
  lista.push({ id: proximoId(), motivo, regra: regraTexto, por: executor.id, data: Date.now() });
  salvarAvisos(membro.id, lista);

  const total = lista.length;
  const lim = limite();
  const vars = {
    servidor: guild.name,
    motivo,
    regra: regraTexto || 'não informada',
    avisos: String(total),
    limite: String(lim),
  };
  let dm = false;
  let noCanal = null;
  if (opcoes.canal) {
    try {
      noCanal = { msg: await anunciarNoCanal(opcoes.canal, membro, motivo, regraTexto, total, lim) };
    } catch (e) {
      // Não deu para postar no canal: avisa por DM para o membro não ficar sem saber
      console.error('[Moderação] advertência no canal:', e.message);
      noCanal = { erro: e.message };
      dm = await enviarDM(membro.user, 'dmAviso', vars);
    }
  } else {
    dm = await enviarDM(membro.user, 'dmAviso', vars);
  }

  const extras = [{ name: 'Avisos', value: `${total}/${lim}`, inline: true }];
  if (regraTexto) extras.push({ name: 'Regra', value: regraTexto.slice(0, 1024), inline: true });
  await registrar(guild, { titulo: 'Aviso', cor: COR.aviso, alvo: membro.user, executor, motivo, extras });

  let banido = null;
  if (total >= lim) {
    if (!membro.bannable) {
      banido = { ok: false, erro: 'o cargo dele está acima do meu' };
      await registrar(guild, {
        titulo: 'Limite de avisos atingido (não consegui banir)',
        cor: COR.aviso,
        alvo: membro.user,
        executor,
        motivo: 'Limite de avisos atingido, mas o cargo do membro está acima do meu.',
      });
    } else {
      const motivoBan = `Atingiu ${total} avisos: ${lista.map((a) => a.motivo).join('; ')}`.slice(0, 450);
      banido = await banir(guild, executor, membro.user, membro, motivoBan, 0);
    }
  }
  // Tópico só faz sentido se o membro continua no servidor
  if (noCanal && noCanal.msg && !(banido && banido.ok)) {
    try {
      noCanal.topico = await criarTopico(noCanal.msg, executor, membro);
    } catch (e) {
      console.error('[Moderação] tópico da advertência:', e.message);
      noCanal.erroTopico = e.message;
    }
  }
  return { total, limite: lim, dm, banido, noCanal };
}

// Janela para editar as mensagens de DM (usada pelo comando e pelos botões do painel)
function modalMensagem(tipo) {
  const atual = mensagem(tipo);
  return new ModalBuilder()
    .setCustomId(`moderacao:modal:${tipo}`)
    .setTitle('Editar mensagem')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('titulo').setLabel('Título').setStyle(TextInputStyle.Short)
          .setMaxLength(200).setRequired(true).setValue(atual.titulo.slice(0, 200))
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('texto').setLabel('Texto da mensagem').setStyle(TextInputStyle.Paragraph)
          .setMaxLength(2000).setRequired(true).setValue(atual.texto.slice(0, 2000))
      )
    );
}

module.exports = {
  modalMensagem,
  COR,
  PADROES,
  cfg,
  limite,
  regras,
  mensagem,
  preencher,
  avisosDe,
  salvarAvisos,
  checarHierarquia,
  registrar,
  banir,
  expulsar,
  desbanir,
  darAviso,
  canalAdvertencia,
  ehStaffTopico,
};
