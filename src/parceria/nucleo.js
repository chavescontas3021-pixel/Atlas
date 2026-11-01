// Sistema de parcerias: quando alguém manda um convite de servidor no canal dedicado,
// o Atlas posta a mensagem de parceria marcando o cargo (normal) ou @everyone.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;

// Variáveis aceitas nos textos (fonte única: comando e site mostram essa mesma lista)
const VARIAVEIS = '{convite} {servidor_parceiro} {representante} {promotor} {pontos} {rank} {cargo} {servidor}';

// Os dois tipos de parceria
const TIPOS = {
  normal: { nome: 'Parceria (marca o cargo)', emoji: '🤝' },
  everyone: { nome: 'Parceria @everyone', emoji: '📢' },
};

const PADROES = {
  normal: {
    titulo: '🤝 Nova parceria!',
    texto:
      'Mais um servidor incrível se juntou a nós! 💜\n\n{convite}\n\n' +
      '🌐 Servidor: **{servidor_parceiro}**\n👤 Representante: {representante}\n' +
      '🤝 Promotor: {promotor} — {pontos} parceria(s) • rank #{rank}',
  },
  everyone: {
    titulo: '📢 Parceria especial!',
    texto:
      'Temos uma parceria especial para vocês! ✨\n\n{convite}\n\n' +
      '🌐 Servidor: **{servidor_parceiro}**\n👤 Representante: {representante}\n' +
      '🤝 Promotor: {promotor} — {pontos} parceria(s) • rank #{rank}',
  },
};

const SEM_REP = 'não informado';

const REGEX_CONVITE =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/[A-Za-z0-9-]{2,32}/i;

const cfg = (tipo, chave, padrao) => db.get(`config.parceria.${tipo}.${chave}`, padrao);

// Configuração completa de um tipo, já com os textos padrão
function conf(tipo) {
  return {
    ativo: cfg(tipo, 'ativo', false) === true,
    canal: cfg(tipo, 'canal', null),
    cargo: cfg(tipo, 'cargo', null),
    banner: cfg(tipo, 'banner', null),
    titulo: cfg(tipo, 'titulo', PADROES[tipo].titulo),
    texto: cfg(tipo, 'texto', PADROES[tipo].texto),
    semRep: cfg(tipo, 'semRepresentante', SEM_REP),
  };
}

// Acha o primeiro convite de servidor no texto (ou null)
function acharConvite(texto) {
  const m = String(texto || '').match(REGEX_CONVITE);
  if (!m) return null;
  return /^https?:\/\//i.test(m[0]) ? m[0] : `https://${m[0]}`;
}

function bannerValido(url) {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return /^https?:\/\/\S+$/i.test(t) && t.length <= 500 ? t : null;
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// ---------- Pontos e rank dos promotores ----------
// Cada parceria feita vale 1 ponto para o promotor. Guardado em parceria.pontos.<id do membro>.
const pontosTodos = () => {
  const p = db.get('parceria.pontos', {});
  return p && typeof p === 'object' ? p : {};
};
const pontosDe = (uid) => Math.max(0, Math.floor(Number(pontosTodos()[uid]) || 0));

function definirPontos(uid, n) {
  const v = Math.max(0, Math.min(1000000, Math.floor(Number(n) || 0)));
  if (v === 0) db.remover(`parceria.pontos.${uid}`);
  else db.set(`parceria.pontos.${uid}`, v);
  return v;
}
const somarPonto = (uid, delta = 1) => definirPontos(uid, pontosDe(uid) + delta);

// Lista ordenada (mais pontos primeiro; empate = ordem alfabética do id, só para ficar estável)
function ranking(limite = 10) {
  return Object.keys(pontosTodos())
    .map((uid) => ({ uid, pontos: pontosDe(uid) }))
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.uid.localeCompare(b.uid))
    .slice(0, limite);
}

// Posição no rank (empatados dividem a mesma posição). Sem pontos = último + 1.
function rankDe(uid) {
  const meus = pontosDe(uid);
  const todos = Object.keys(pontosTodos()).map(pontosDe).filter((n) => n > 0);
  return todos.filter((n) => n > meus).length + 1;
}

// ---------- Dados tirados da mensagem do convite ----------
function codigoDoConvite(convite) {
  const m = String(convite || '').match(/\/([A-Za-z0-9-]{2,32})\/?$/);
  return m ? m[1] : null;
}

// Nome do servidor DO CONVITE (não o servidor onde ele foi postado). null se não achar.
async function servidorDoConvite(client, convite) {
  const codigo = codigoDoConvite(convite);
  if (!codigo) return null;
  try {
    const inv = await client.fetchInvite(codigo);
    return (inv && inv.guild && inv.guild.name) || null;
  } catch {
    return null; // convite expirado/inválido
  }
}

// Representante = primeira pessoa marcada na mensagem do promotor (ignora bots e o próprio promotor)
function acharRepresentante(message) {
  const u = message.mentions && message.mentions.users;
  if (!u) return null;
  const achado = u.find((x) => !x.bot && x.id !== message.author.id);
  return achado ? achado.id : null;
}

// Monta a mensagem de um tipo. "preview" = não marca ninguém de verdade.
function montar(tipo, dados, { preview = false } = {}) {
  const { membroId, convite, servidor, servidorParceiro, representanteId, pontos, rank } = dados;
  const c = conf(tipo);
  const vars = {
    membro: `<@${membroId}>`,
    promotor: `<@${membroId}>`,
    convite,
    servidor: servidor || '',
    servidor_parceiro: servidorParceiro || 'servidor não identificado',
    representante: representanteId ? `<@${representanteId}>` : c.semRep,
    pontos: String(pontos === undefined ? pontosDe(membroId) : pontos),
    rank: String(rank === undefined ? rankDe(membroId) : rank),
    cargo: c.cargo ? `<@&${c.cargo}>` : '',
  };

  const embed = new EmbedBuilder().setColor(COR).setDescription(preencher(c.texto, vars).slice(0, 4000));
  const titulo = preencher(c.titulo || '', vars).trim();
  if (titulo) embed.setTitle(titulo.slice(0, 256));
  const banner = bannerValido(c.banner);
  if (banner) embed.setImage(banner);

  // Só o cargo (parceria normal) ou o @everyone ficam fora do embed e notificam.
  // Promotor e representante aparecem marcados dentro do embed.
  let content;
  let allowedMentions;
  if (tipo === 'everyone') {
    content = '@everyone';
    allowedMentions = { parse: ['everyone'] };
  } else if (c.cargo) {
    content = `<@&${c.cargo}>`;
    allowedMentions = { roles: [c.cargo] };
  } else {
    allowedMentions = { parse: [] };
  }

  if (preview) {
    content = `*(Prévia — ninguém foi marcado)* ${content ? `Marcaria: ${content.replace('@everyone', '`@everyone`')}` : 'Sem cargo definido.'}`;
    return { content, embeds: [embed], allowedMentions: { parse: [] } };
  }
  return { content, embeds: [embed], allowedMentions };
}

module.exports = {
  TIPOS, PADROES, SEM_REP, VARIAVEIS, conf, acharConvite, bannerValido, montar, cfg,
  pontosDe, definirPontos, somarPonto, ranking, rankDe, servidorDoConvite, acharRepresentante,
};
