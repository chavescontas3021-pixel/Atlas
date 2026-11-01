// Sistema de parcerias: quando alguém manda um convite de servidor no canal dedicado,
// o Atlas posta a mensagem de parceria marcando o cargo (normal) ou @everyone.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;

// Os dois tipos de parceria
const TIPOS = {
  normal: { nome: 'Parceria (marca o cargo)', emoji: '🤝' },
  everyone: { nome: 'Parceria @everyone', emoji: '📢' },
};

const PADROES = {
  normal: {
    titulo: '🤝 Nova parceria!',
    texto: 'Mais um servidor incrível se juntou a nós! 💜\n\n{convite}\n\nParceria feita por {membro}.',
  },
  everyone: {
    titulo: '📢 Parceria especial!',
    texto: 'Temos uma parceria especial para vocês! ✨\n\n{convite}\n\nParceria feita por {membro}.',
  },
};

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

// Monta a mensagem de um tipo. "preview" = não marca ninguém de verdade.
function montar(tipo, { membroId, convite, servidor }, { preview = false } = {}) {
  const c = conf(tipo);
  const vars = {
    membro: `<@${membroId}>`,
    convite,
    servidor: servidor || '',
    cargo: c.cargo ? `<@&${c.cargo}>` : '',
  };

  const embed = new EmbedBuilder().setColor(COR).setDescription(preencher(c.texto, vars).slice(0, 4000));
  const titulo = preencher(c.titulo || '', vars).trim();
  if (titulo) embed.setTitle(titulo.slice(0, 256));
  const banner = bannerValido(c.banner);
  if (banner) embed.setImage(banner);

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
    allowedMentions = { parse: [] };
  }
  return { content, embeds: [embed], allowedMentions };
}

module.exports = { TIPOS, PADROES, conf, acharConvite, bannerValido, montar, cfg };
