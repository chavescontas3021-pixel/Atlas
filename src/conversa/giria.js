// ─────────────────────────────────────────────────────────────
//  ATLAS · gírias, abreviações e erros de digitação
//
//  Antes de procurar o assunto, o texto passa por aqui:
//    1. letras repetidas viram uma só (oiii → oi, kkkkk → k)
//    2. abreviações e gírias viram a palavra completa (vc → voce, vlw → valeu)
//    3. se mesmo assim nada for entendido, tenta consertar erros de digitação
//  Para ensinar uma gíria nova, basta acrescentar uma linha em ABREV.
// ─────────────────────────────────────────────────────────────
const ABREV = {
  // pessoas e pronomes
  vc: 'voce', vcs: 'voces', voc: 'voce', cê: 'voce', ce: 'voce', tu: 'voce', ctg: 'contigo', cmg: 'comigo', ngm: 'ninguem', ninguem: 'ninguem',
  // conectivos e palavras curtas
  q: 'que', oq: 'o que', pq: 'porque', pqe: 'porque', porq: 'porque', n: 'nao', nn: 'nao', naum: 'nao', ñ: 'nao', s: 'sim', ss: 'sim', sm: 'sim',
  tb: 'tambem', tbm: 'tambem', tmb: 'tambem', td: 'tudo', tds: 'todos', mt: 'muito', mto: 'muito', mta: 'muita', mts: 'muitos', dms: 'demais',
  hj: 'hoje', amn: 'amanha', agr: 'agora', msm: 'mesmo', dnv: 'de novo', qnd: 'quando', qdo: 'quando', qd: 'quando', onde: 'onde', kd: 'cade',
  qq: 'qualquer', msg: 'mensagem', add: 'adiciona', vdd: 'verdade', ctz: 'certeza', sla: 'sei la', sqn: 'so que nao', pdc: 'pode crer',
  // pedidos e cortesia
  pfv: 'por favor', pf: 'por favor', pfvr: 'por favor', plmds: 'pelo amor de deus', mds: 'meu deus', pdp: 'pode pa', brigado: 'obrigado',
  obg: 'obrigado', obgd: 'obrigado', obgda: 'obrigada', vlw: 'valeu', vlws: 'valeu', valew: 'valeu', agradecido: 'obrigado',
  // cumprimentos e despedidas
  flw: 'falou', flws: 'falou', fui: 'fui', blz: 'beleza', blza: 'beleza', fmz: 'firmeza', tmj: 'tamo junto', tlgd: 'ta ligado', sdds: 'saudades', sdd: 'saudade',
  eae: 'e ai', eai: 'e ai', iae: 'e ai', coe: 'e ai', salve: 'salve', opa: 'opa', bomdia: 'bom dia', boatarde: 'boa tarde', boanoite: 'boa noite',
  bdia: 'bom dia', btarde: 'boa tarde', bnoite: 'boa noite', gnt: 'gente', mano: 'mano', mn: 'mano', mlk: 'moleque', parca: 'amigo', parça: 'amigo',
  // gírias que significam "legal", "ruim", "ok"
  dahora: 'legal', daora: 'legal', massa: 'legal', top: 'legal', topzera: 'legal', show: 'legal', sussa: 'tranquilo', suave: 'tranquilo', tranquilo: 'tranquilo',
  paia: 'ruim', zuado: 'ruim', ruinzao: 'ruim', bagulho: 'coisa', rolê: 'passeio', role: 'passeio', trampo: 'trabalho', treta: 'briga',
  // risadas e reações
  kkk: 'k', rsrs: 'k', rs: 'k', hehe: 'k', ksks: 'k', kjkj: 'k', lol: 'k', lmao: 'k', kkkk: 'k',
  // outros
  ta: 'esta', tá: 'esta', tao: 'tao', eh: 'e', neh: 'ne', né: 'ne', pra: 'para', pro: 'para o', numa: 'em uma', num: 'em um',
  tô: 'to', tou: 'to', estou: 'estou', cmo: 'como', cm: 'com', cmg2: 'comigo', fds: 'fim de semana', slc: 'sei la',
};

// Remove acento para casar com o texto já normalizado
const sem = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
const MAPA = new Map(Object.entries(ABREV).map(([k, v]) => [sem(k), sem(v)]));
// Palavras que não devem mudar mesmo estando no mapa (já têm padrão próprio ou mudariam o sentido)
const FICA = new Set(['ta', 'tao', 'pra', 'pro', 'to', 'eh', 'fui', 'opa', 'salve', 'mano', 'onde', 'tranquilo', 'ninguem', 'fds', 'estou', 'cmg2']);
FICA.forEach((k) => MAPA.delete(k));

// letras repetidas 3+ vezes viram 1 (só letras, números ficam como estão)
const repetidas = (t) => t.replace(/([a-z])\1{2,}/g, '$1');

// "muito triste" e "triste" significam o mesmo para o Atlas ("bem" fica, porque existe "tudo bem")
const INTENSIDADE = new Set(['muito', 'super', 'meio', 'demais', 'bastante', 'extremamente', 'completamente', 'totalmente', 'hiper']);

function girias(texto) {
  const toks = repetidas(String(texto)).split(' ');
  const out = toks.map((w) => MAPA.get(w) || w).join(' ').split(' ').filter((w) => !INTENSIDADE.has(w));
  return out.join(' ');
}

// ── Erros de digitação ───────────────────────────────────────
const PALAVRAS = [
  'obrigado', 'obrigada', 'tchau', 'saudade', 'saudades', 'piada', 'curiosidade', 'cansado', 'cansada', 'triste', 'feliz', 'animado',
  'parabens', 'ajuda', 'quando', 'quanto', 'horas', 'calcula', 'significa', 'escolhe', 'dicionario', 'palavra', 'entediado', 'entediada',
  'segredo', 'musica', 'cantar', 'brincar', 'conversar', 'responde', 'pergunta', 'resposta', 'amiga', 'amigo', 'criador', 'personagem',
  'ola', 'oi', 'bomdia', 'boatarde', 'boanoite', 'dormir', 'acordado', 'acordada', 'comida', 'jantar', 'almoco', 'lanche', 'cafe',
  'burro', 'idiota', 'chato', 'chata', 'inutil', 'bobo', 'bobao', 'lindo', 'linda', 'incrivel', 'fofo', 'fofa', 'legal', 'maravilhoso',
  'favorito', 'favorita', 'preferido', 'preferida', 'gosta', 'acha', 'pensa', 'opiniao', 'amanha', 'ontem', 'semana', 'mensagem',
  'beleza', 'certo', 'entendi', 'combinado', 'talvez', 'verdade', 'mentira', 'certeza', 'jogar', 'brincadeira', 'pedra', 'papel', 'tesoura',
  'ninguem', 'alguem', 'sempre', 'nunca', 'comando', 'comandos', 'servidor', 'house', 'staff', 'moderador', 'admin', 'dono',
];
const CONHECIDAS = new Set(PALAVRAS);

function distancia(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    ant = atual;
  }
  return ant[b.length];
}

// Conserta palavras com 1 letra errada (ou 2, se forem longas). Só mexe no que não conhece.
function corrigir(texto) {
  let mudou = false;
  const out = String(texto).split(' ').map((w) => {
    if (w.length < 5 || CONHECIDAS.has(w) || !/^[a-z]+$/.test(w)) return w;
    const max = w.length >= 8 ? 2 : 1;
    let melhor = null;
    let dm = max + 1;
    for (const c of PALAVRAS) {
      const d = distancia(w, c, max);
      if (d < dm) { dm = d; melhor = c; }
    }
    if (melhor && dm <= max) { mudou = true; return melhor; }
    return w;
  });
  return mudou ? out.join(' ') : texto;
}

// Parece teclada aleatória? (5+ consoantes seguidas, ou nenhuma vogal numa palavra longa)
const ininteligivel = (texto) => /[^aeiou\s0-9]{5,}/.test(texto) || String(texto).split(' ').every((w) => w.length > 3 && !/[aeiou]/.test(w));

module.exports = { ABREV, girias, corrigir, ininteligivel, repetidas };
