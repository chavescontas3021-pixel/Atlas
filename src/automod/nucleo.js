// Núcleo do automod: configurações e detecção de palavras proibidas (com truques de escrita).
const { PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const PAL = require('./palavras');

const cfg = (k, p) => db.get(`config.automod.${k}`, p);
const lista = (k) => {
  const v = cfg(k, []);
  return Array.isArray(v) ? v : [];
};

const ativo = () => cfg('ativo', true) !== false;
const extras = () => lista('extras'); // personalizadas graves
const extrasLeves = () => lista('extrasLeves'); // personalizadas leves
const liberadas = () => lista('liberadas');
const canaisIgnorados = () => lista('canaisIgnorados');
const cargosIsentos = () => lista('cargosIsentos');
const modoLeve = () => (cfg('leve', 'apagar') === 'advertir' ? 'advertir' : 'apagar');
const nomesAtivo = () => cfg('nomes', true) !== false;

// ---------- Normalização ----------
// Letras de outros alfabetos que imitam as nossas
const CONFUSAVEIS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'к': 'k',
  'м': 'm', 'н': 'h', 'т': 't', 'в': 'b', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'ӏ': 'l',
  'α': 'a', 'ε': 'e', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't', 'υ': 'u', 'η': 'n',
  'ß': 'ss', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'ł': 'l', 'đ': 'd',
};
// Números e símbolos que viram letra
const LEET = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '6': 'g', '@': 'a', '$': 's', '€': 'e', '¢': 'c', '©': 'c', '£': 'l', '°': 'o' };

function limpezaBase(texto) {
  let t = String(texto || '').normalize('NFKC').toLowerCase();
  t = t.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00ad]/g, ''); // caracteres invisíveis
  t = t.replace(/https?:\/\/\S+/g, ' ').replace(/<[^>]*>/g, ' '); // links e menções
  t = t.replace(/[^\u0000-\u007f]/g, (c) => CONFUSAVEIS[c] || c);
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Jeitos diferentes de escrever o mesmo som
const foneticas = (s) => s.replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/y/g, 'i').replace(/w/g, 'u');

// Gera as versões do texto que valem a pena checar (1 a 6 versões)
function variantes(texto, juntar = true) {
  const base = limpezaBase(texto);
  // "1", "!" e "|" podem ser i ou l (ou só pontuação); testamos as três leituras
  const modos = /[1!|]/.test(base)
    ? [{ '1': 'i', '!': 'i', '|': 'i' }, { '1': 'l', '!': 'l', '|': 'l' }, { '1': 'i', '!': ' ', '|': ' ' }]
    : [{ '1': 'i' }];

  const saida = new Set();
  for (const modo of modos) {
    const t = base.replace(/[1!|0345-9@$€¢©£°]/g, (c) => (modo[c] !== undefined ? modo[c] : LEET[c] !== undefined ? LEET[c] : c));
    // versão A: símbolos viram espaço; versão B: pontos/hífens/asteriscos no meio da palavra somem (pu.ta)
    for (const v of [t, t.replace(/[.\-_*'’`~+·•]+/g, '')]) {
      let s = v.replace(/[^a-z]+/g, ' ').trim();
      if (juntar) {
        const juntas = (s.match(/\b(?:[a-z] ){2,}[a-z]\b/g) || []).map((m) => m.replace(/ /g, '')); // p u t a
        if (juntas.length) s += ` ${juntas.join(' ')}`;
      }
      s = foneticas(s);
      if (s) saida.add(s);
    }
  }
  return [...saida];
}

// Usada para comparar palavras da lista (um termo vira um texto só)
const normalizar = (termo) => (variantes(termo, false)[0] || '');

// ---------- Lista compilada (refeita só quando as configurações mudam) ----------
// Cada letra aceita repetição (puuuta, bucetta) e cada palavra aceita plural (cartões, armas)
function padraoDoTermo(termo) {
  const letras = (w) => [...w].map((c) => `${c}+`).join('');
  return termo
    .split(' ')
    .map((w) => (w.endsWith('ao') && w.length > 3 ? `${letras(w.slice(0, -2))}(?:a+o+s*|o+e+s+)` : `${letras(w)}(?:s|es)?`))
    .join(' ');
}

let cache = { chave: null, regras: [] };

function compilar() {
  const chave = JSON.stringify([extras(), extrasLeves(), liberadas()]);
  if (cache.chave === chave) return cache.regras;

  const livres = new Set(liberadas().map(normalizar));
  const grupos = [];
  for (const [categoria, termos] of Object.entries(PAL.graves)) grupos.push({ categoria, advertir: true, termos });
  grupos.push({ categoria: 'termo personalizado', advertir: true, termos: extras() });
  for (const [categoria, termos] of Object.entries(PAL.leves)) grupos.push({ categoria, advertir: false, termos });
  grupos.push({ categoria: 'termo personalizado (leve)', advertir: false, termos: extrasLeves() });

  const regras = [];
  for (const g of grupos) {
    const limpos = [...new Set(g.termos.map(normalizar).filter((t) => t.length >= 3 && !livres.has(t)))].sort((a, b) => b.length - a.length);
    if (!limpos.length) continue;
    const longos = limpos.filter((t) => !t.includes(' ') && t.length >= 8); // palavras grandes também são achadas "coladas" (pu ta ria)
    regras.push({
      categoria: g.categoria,
      advertir: g.advertir,
      regex: new RegExp(`(?:^| )(${limpos.map(padraoDoTermo).join('|')})(?= |$)`),
      compacto: longos.length ? new RegExp(`^(${longos.map(padraoDoTermo).join('|')})$`) : null,
    });
  }
  cache = { chave, regras };
  return regras;
}

// ---------- Expressões inofensivas ----------
// Frases do dia a dia (ex.: "te mato de rir") são apagadas do texto ANTES de procurar palavras proibidas.
let regexInofensivas;
function inofensivas() {
  if (regexInofensivas === undefined) {
    const lista = [...new Set((PAL.inofensivas || []).map(normalizar).filter(Boolean))].sort((a, b) => b.length - a.length);
    regexInofensivas = lista.length ? new RegExp(`(?:^| )(?:${lista.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?= |$)`, 'g') : null;
  }
  return regexInofensivas;
}

function semInofensivas(v) {
  const re = inofensivas();
  return re ? v.replace(re, ' ').replace(/ +/g, ' ').trim() : v;
}

// Palavras longas escritas em pedaços ("pu ta ria"): só vale se algum pedaço for bem curto (1-2 letras).
// Isso evita juntar palavras normais vizinhas por acidente (ex.: "trans" + "ando").
function achaCompacto(v, re) {
  const t = v.split(' ').filter(Boolean);
  if (t.length < 2) return null;
  for (let i = 0; i < t.length; i++) {
    let junto = '';
    for (let j = i; j < t.length && j < i + 8; j++) {
      junto += t[j];
      if (junto.length > 40) break;
      if (j > i && t.slice(i, j + 1).some((x) => x.length <= 2)) {
        const m = junto.match(re);
        if (m) return m[1];
      }
    }
  }
  return null;
}

// ---------- Detecção ----------
function linkAdulto(texto) {
  const re = /https?:\/\/([^\s\/?#>]+)/gi;
  let m;
  while ((m = re.exec(texto))) {
    const host = m[1].toLowerCase();
    const achou = PAL.dominios.find((d) => host.includes(d));
    if (achou) return achou;
  }
  return null;
}

function emojiSexual(texto) {
  const um = PAL.emojis.find((e) => texto.includes(e));
  if (um) return um;
  const combo = PAL.emojiCombos.find((c) => c.every((e) => texto.includes(e)));
  return combo ? combo.join('') : null;
}

// Devolve { categoria, termo, advertir } ou null
function detectar(texto) {
  const bruto = String(texto || '');
  if (!bruto.trim()) return null;

  const simbolo = (PAL.simbolos || []).find((e) => bruto.includes(e));
  if (simbolo) return { categoria: 'símbolo de ódio', termo: simbolo, advertir: true };

  const dom = linkAdulto(bruto);
  if (dom) return { categoria: 'link de conteúdo adulto', termo: dom, advertir: true };

  const vars = variantes(bruto).map(semInofensivas).filter(Boolean);
  for (const r of compilar()) {
    for (const v of vars) {
      const m = v.match(r.regex);
      if (m) return { categoria: r.categoria, termo: m[1], advertir: r.advertir };
    }
    if (r.compacto) {
      for (const v of vars) {
        const termo = achaCompacto(v, r.compacto);
        if (termo) return { categoria: r.categoria, termo, advertir: r.advertir };
      }
    }
  }

  const em = emojiSexual(bruto);
  if (em) return { categoria: 'conteúdo sexual', termo: em, advertir: false };
  return null;
}

// A palavra existe na lista de fábrica?
function naListaPadrao(termo) {
  const n = normalizar(termo);
  const todas = [...Object.values(PAL.graves), ...Object.values(PAL.leves)].flat();
  return todas.some((t) => normalizar(t) === n);
}

// ---------- Quem é isento ----------
function isento(membro) {
  if (membro.id === membro.guild.ownerId) return true;
  const p = membro.permissions;
  if (p.has(P.Administrator) || p.has(P.ManageGuild) || p.has(P.ModerateMembers) || p.has(P.ManageMessages)) return true;
  const cargos = cargosIsentos();
  return membro.roles.cache.some((r) => cargos.includes(r.id));
}

function canalIgnorado(canal) {
  const ign = canaisIgnorados();
  return !!canal && (ign.includes(canal.id) || (canal.parentId && ign.includes(canal.parentId)));
}

module.exports = {
  cfg, ativo, extras, extrasLeves, liberadas, canaisIgnorados, cargosIsentos, modoLeve, nomesAtivo,
  normalizar, detectar, naListaPadrao, isento, canalIgnorado,
};
