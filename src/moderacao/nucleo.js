const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = { aviso: 0xf1c40f, ban: 0xe74c3c, kick: 0xe67e22, ok: 0x2ecc71 };

const PADROES = {
  limite: 3,
  mensagens: {
    dmAviso: {
      titulo: '⚠️ Você recebeu um aviso',
      texto:
        'Você recebeu um aviso em **{servidor}**.\n\n**Motivo:** {motivo}\n**Regra:** {regra}\n' +
        '**Avisos:** {avisos}/{limite}\n\nAo chegar em {limite} avisos, você será banido(a).',
    },
    dmBan: {
      titulo: '🔨 Você foi banido(a)',
      texto: 'Você foi banido(a) de **{servidor}**.\n\n**Motivo:** {motivo}',
    },
    dmExpulsao: {
      titulo: '👢 Você foi expulso(a)',
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
  if (alvo.id === guild.client.user.id) return 'Eu não vou fazer isso comigo 😅';
  if (executor.id !== guild.ownerId && alvo.roles.highest.position >= executor.roles.highest.position) {
    return 'Esse membro tem um cargo igual ou acima do seu.';
  }
  return null;
}

async function enviarDM(user, tipo, vars) {
  const msg = mensagem(tipo);
  const cor = tipo === 'dmAviso' ? COR.aviso : tipo === 'dmBan' ? COR.ban : COR.kick;
  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle(preencher(msg.titulo, vars))
    .setDescription(preencher(msg.texto, vars))
    .setTimestamp();
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

  const embed = new EmbedBuilder()
    .setColor(cor)
    .setTitle(titulo)
    .addFields(
      { name: 'Membro', value: `<@${alvo.id}> (\`${alvo.tag}\`)`, inline: true },
      { name: 'Por', value: `<@${executor.id}>`, inline: true },
      { name: 'Motivo', value: String(motivo).slice(0, 1024) || '—' },
      ...extras
    )
    .setTimestamp();
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
  await registrar(guild, { titulo: '🔨 Banimento', cor: COR.ban, alvo: user, executor, motivo });
  return { ok: true, dm };
}

async function expulsar(guild, executor, membro, motivo) {
  const dm = await enviarDM(membro.user, 'dmExpulsao', varsBase(guild, motivo));
  try {
    await membro.kick(`${motivo} | por ${executor.tag}`.slice(0, 512));
  } catch (erro) {
    return { ok: false, erro: erro.message, dm };
  }
  await registrar(guild, { titulo: '👢 Expulsão', cor: COR.kick, alvo: membro.user, executor, motivo });
  return { ok: true, dm };
}

async function desbanir(guild, executor, id, motivo) {
  try {
    const user = await guild.members.unban(id, `${motivo} | por ${executor.tag}`.slice(0, 512));
    await registrar(guild, { titulo: '✅ Desbanimento', cor: COR.ok, alvo: user, executor, motivo });
    return { ok: true, user };
  } catch (erro) {
    return { ok: false, erro: erro.message };
  }
}

async function darAviso(guild, executor, membro, motivo, numeroRegra) {
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
  const dm = await enviarDM(membro.user, 'dmAviso', vars);

  const extras = [{ name: 'Avisos', value: `${total}/${lim}`, inline: true }];
  if (regraTexto) extras.push({ name: 'Regra', value: regraTexto.slice(0, 1024), inline: true });
  await registrar(guild, { titulo: '⚠️ Aviso', cor: COR.aviso, alvo: membro.user, executor, motivo, extras });

  let banido = null;
  if (total >= lim) {
    if (!membro.bannable) {
      banido = { ok: false, erro: 'o cargo dele está acima do meu' };
      await registrar(guild, {
        titulo: '⚠️ Limite de avisos atingido (não consegui banir)',
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
  return { total, limite: lim, dm, banido };
}

module.exports = {
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
};
