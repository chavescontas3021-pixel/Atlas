// ─────────────────────────────────────────────────────────────
//  ATLAS · palavrões
//
//  Lista dos palavrões que o Atlas pode DIZER. São os comuns que o automod
//  deixa de fora de propósito (veja src/automod/palavras-extra.js).
//  Mesmo assim, cada frase é conferida no automod antes de sair: se ele
//  bloquearia aquela frase para um membro, o Atlas escolhe outra.
//  Sem ofensa a família, aparência, raça, gênero, orientação ou deficiência.
// ─────────────────────────────────────────────────────────────
const LISTA = [
  'caralho', 'porra', 'merda', 'bosta', 'cacete', 'foda-se', 'foder', 'fodido', 'fodida', 'fodeu',
  'fdp', 'filho da puta', 'puta que pariu', 'puta merda', 'pqp', 'vai tomar no cu', 'tomar no cu',
  'vsf', 'vtnc', 'cuzao', 'babaca', 'otario', 'otaria', 'imbecil', 'escroto', 'escrota',
  'arrombado', 'arrombada', 'desgracado', 'desgracada', 'krl', 'crlh', 'lazarento', 'infeliz',
];

const sem = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const REGEX = new RegExp(`(?<![a-z0-9])(?:${LISTA.map((p) => escapar(p) + '(?:s)?').join('|')})(?![a-z0-9])`);

// A frase tem algum palavrão?
const temPalavrao = (texto) => REGEX.test(sem(texto));

// O automod deixaria um membro dizer isso? (se o automod não existir, vale como seguro)
function seguroNoAutomod(texto) {
  try {
    return !require('../automod/nucleo').detectar(String(texto || ''));
  } catch {
    return true;
  }
}

module.exports = { LISTA, temPalavrao, seguroNoAutomod };
