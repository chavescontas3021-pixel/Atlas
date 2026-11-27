const { PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const PAL = require('./palavras');

const cfg = (k, p) => db.get(`config.automod.${k}`, p);
const lista = (k) => {
  const v = cfg(k, []);
  return Array.isArray(v) ? v : [];
};

const ativo = () => cfg('ativo', true) !== false;
const extras = () => lista('extras');
const extrasLeves = () => lista('extrasLeves');
const liberadas = () => lista('liberadas');
const canaisIgnorados = () => lista('canaisIgnorados');
const cargosIsentos = () => lista('cargosIsentos');
const modoLeve = () => (cfg('leve', 'apagar') === 'advertir' ? 'advertir' : 'apagar');
const nomesAtivo = () => cfg('nomes', true) !== false;

const CONFUSAVEIS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'к': 'k',
  'м': 'm', 'н': 'h', 'т': 't', 'в': 'b', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'ӏ': 'l',
  'α': 'a', 'ε': 'e', 'ο': 'o', 'ρ': 'p', 'ν': 'v', 'ι': 'i', 'κ': 'k', 'τ': 't', 'υ': 'u', 'η': 'n',
  'ß': 'ss', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'ł': 'l', 'đ': 'd',
};
const LEET = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g', '6': 'g', '@': 'a', '$': 's', '€': 'e', '¢': 'c', '©': 'c', '£': 'l', '°': 'o' };

function limpezaBase(texto) {
  let t = String(texto || '').normalize('NFKC').toLowerCase();
  t = t.replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00ad]/g, '');
  t = t.replace(/https?:\/\/\S+/g, ' ').replace(/<[^>]*>/g, ' ');
  t = t.replace(/[^\u0000-\u007f]/g, (c) => CONFUSAVEIS[c] || c);
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const foneticas = (s) => s.replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/y/g, 'i').replace(/w/g, 'u');

function variantes(texto, juntar = true) {
  const base = limpezaBase(texto);
  const modos = /[1!|]/.test(base)
    ? [{ '1': 'i', '!': 'i', '|': 'i' }, { '1': 'l', '!': 'l', '|': 'l' }, { '1': 'i', '!': ' ', '|': ' ' }]
    : [{ '1': 'i' }];

  const saida = new Set();
  for (const modo of modos) {
    const t = base.replace(/[1!|0345-9@$€¢©£°]/g, (c) => (modo[c] !== undefined ? modo[c] : LEET[c] !== undefined ? LEET[c] : c));
    for (const v of [t, t.replace(/[.\-_*'’`~+·•]+/g, '')]) {
      let s = v.replace(/[^a-z]+/g, ' ').trim();
      if (juntar) {
        const juntas = (s.match(/\b(?:[a-z] ){2,}[a-z]\b/g) || []).map((m) => m.replace(/ /g, ''));
        if (juntas.length) s += ` ${juntas.join(' ')}`;
      }
      s = foneticas(s);
      if (s) saida.add(s);
    }
  }
  return [...saida];
}

const normalizar = (termo) => (variantes(termo, false)[0] || '');

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
    const longos = limpos.filter((t) => !t.includes(' ') && t.length >= 8);
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

function naListaPadrao(termo) {
  const n = normalizar(termo);
  const todas = [...Object.values(PAL.graves), ...Object.values(PAL.leves)].flat();
  return todas.some((t) => normalizar(t) === n);
}

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
