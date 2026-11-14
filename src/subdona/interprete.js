// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · entende ordens em português
//  "atlas, silencia @fulano 10 min spam"  →  { acao:'silenciar', alvo, ms, motivo }
//  Só regras e palavras-chave: sem IA, sem custo. Função pura (fácil de testar).
// ─────────────────────────────────────────────────────────────
const sem = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const ABERTURA = '^(?:(?:por favor|pf|pode|consegue|poderia|vc pode|voce pode|faz favor de|faz|agora|entao|bora|vai)\\s+)*';

// Cada ordem: id, padrão do verbo e prioridade (a maior ganha). 
const ORDENS = [
  { acao: 'desbanir', p: 90, re: 'desban[a-z]*|unban|tira (?:o )?ban[a-z]*|perdoa' },
  { acao: 'tirar_silencio', p: 88, re: 'desmuta[a-z]*|tira (?:o )?(?:castigo|silencio|mute|timeout)(?: d[eoa])?|destimeout|solta|libera' },
  { acao: 'banir', p: 80, re: 'ban[a-z]*|bani[a-z]*' },
  { acao: 'expulsar', p: 80, re: 'expuls[a-z]*|kika[a-z]*|kick[a-z]*|chuta[a-z]*' },
  { acao: 'silenciar', p: 80, re: 'silencia[a-z]*|muta[a-z]*|castiga[a-z]*|timeout|cala' },
  { acao: 'advertir', p: 80, re: 'advert[a-z]*|adverte[a-z]*|da (?:um )?aviso (?:a|para|pro|pra)|dar (?:um )?aviso (?:a|para|pro|pra)|avisa (?:o|a)|avisa' },
  { acao: 'limpar', p: 82, re: '(?:limpa|limpar|apaga|apagar|deleta|deletar)(?: as| os| as ultimas| os ultimos| ultimas| ultimos)?' },
  { acao: 'destrancar', p: 86, re: 'destranc[a-z]*|desbloque[a-z]*|abre|abrir|libera(?= (?:o )?(?:canal|chat))' },
  { acao: 'trancar', p: 84, re: 'tranc[a-z]*|bloque[a-z]*|fecha|fechar' },
  { acao: 'lento', p: 85, re: '(?:tira|tirar|desliga|desligar|sem|ativa|ativar|liga|ligar|poe|bota|coloca|muda)?\\s*(?:o )?(?:modo lento|slowmode|slow mode)' },
  { acao: 'cargo_tirar', p: 92, re: '(?:tira|tirar|remove|remover|retira|retirar) (?:o )?(?:cargo|role)' },
  { acao: 'cargo_dar', p: 92, re: '(?:da|dar|adiciona|adicionar|coloca|colocar|bota|botar|poe|por) (?:o )?(?:cargo|role)' },
  { acao: 'apelido', p: 92, re: '(?:muda|mudar|troca|trocar|altera|alterar|coloca|poe|bota) (?:o )?(?:apelido|nick|nickname)' },
  { acao: 'anunciar', p: 95, re: 'anunci[a-z]*|manda (?:um )?(?:aviso|anuncio|recado)|posta|avisa (?:no|em|na)|diz (?:no|em|na)' },
].map((o) => ({ ...o, rx: new RegExp(`${ABERTURA}(?:${o.re})(?![a-z])`) }));

// ── Tempo ("10 min", "2h", "1 dia", "meia hora") ─────────────
const UNIDADE = { s: 1, seg: 1, segundo: 1, segundos: 1, m: 60, min: 60, minuto: 60, minutos: 60, h: 3600, hr: 3600, hrs: 3600, hora: 3600, horas: 3600, d: 86400, dia: 86400, dias: 86400, sem: 604800, semana: 604800, semanas: 604800 };
function tempo(t) {
  const x = sem(t);
  if (/meia hora/.test(x)) return { s: 1800, trecho: /meia hora/ };
  const m = /(\d+)\s*(segundos?|seg|s|minutos?|min|m|horas?|hrs?|h|dias?|d|semanas?|sem)(?![a-z])/.exec(x) || /\b(uma?|dois|duas|tres|cinco|dez)\s+(segundos?|minutos?|horas?|dias?|semanas?)/.exec(x);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, cinco: 5, dez: 10 }[m[1]];
  return { s: n * UNIDADE[m[2]], trecho: new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) };
}

// Tira da frase o verbo, o tempo e palavras de ligação, sobrando o motivo
function motivoDe(bruto, rxVerbo, { tirarTempo = true, tirarNumero = false } = {}) {
  let t = String(bruto).replace(/<[@#&!]+\d+>/g, ' ').replace(/\b\d{17,20}\b/g, ' ');
  const base = sem(t);
  const mv = new RegExp(`${ABERTURA.replace('^', '')}(?:${rxVerbo})`).exec(base);
  if (mv) t = t.slice(mv.index + mv[0].length);
  if (tirarTempo) { const tm = tempo(t); if (tm) t = t.replace(new RegExp(tm.trecho.source.replace(/\\ /g, '\\s*'), 'i'), ' '); }
  if (tirarNumero) t = t.replace(/\b\d+\b/, ' ');
  t = t.replace(/^(?:[\s,:;.-]|(?:de|do|da|por|pq|porque|motivo|pra|para|a|o|causa)(?![a-zà-ú]))+/i, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

// ── Principal ────────────────────────────────────────────────
// entrada: { bruto (texto sem o "atlas"), usuarios:[ids], cargos:[ids], canais:[ids] }
function entender({ bruto, usuarios = [], cargos = [], canais = [] }) {
  const texto = sem(String(bruto).replace(/<[@#&!]+\d+>/g, ' '));
  if (!texto) return null;
  const candidatas = ORDENS.filter((o) => o.rx.test(texto)).sort((a, b) => b.p - a.p);
  const ordem = candidatas[0];
  if (!ordem) return null;
  let acao = ordem.acao;
  const ids = (String(bruto).match(/\b\d{17,20}\b/g) || []);
  const alvo = usuarios[0] || ids[0] || null;
  const canal = canais[0] || null;
  const tm = tempo(texto);
  const base = { acao, alvo, canal };

  // "libera @fulano" é tirar castigo; "abre"/"libera" sem alvo é destrancar
  if (acao === 'destrancar' && usuarios.length) acao = 'tirar_silencio';
  if (acao === 'tirar_silencio' && !alvo) acao = 'destrancar';
  base.acao = acao;
  const rx = ordem.re;

  switch (acao) {
    case 'limpar': {
      const n = /(\d{1,3})/.exec(texto);
      if (!n && !/mensage|msg/.test(texto)) return null; // "apaga" sozinho é vago demais
      return { ...base, n: Math.min(100, Math.max(1, n ? parseInt(n[1], 10) : 10)), alvo: usuarios[0] || null };
    }
    case 'silenciar':
      return { ...base, ms: Math.min(28 * 86400, tm ? tm.s : 600) * 1000, motivo: motivoDe(bruto, rx) };
    case 'tirar_silencio':
    case 'expulsar':
    case 'advertir':
    case 'banir':
    case 'desbanir':
      return { ...base, motivo: motivoDe(bruto, rx, { tirarTempo: false }) };
    case 'trancar':
    case 'destrancar':
      return { ...base, motivo: motivoDe(bruto, rx, { tirarTempo: false }).replace(/^(?:o )?(?:canal|chat)\b/i, '').trim() };
    case 'lento': {
      const desliga = /(tira|tirar|desliga|desligar|sem|sem o|desativa)/.test(texto) || /\b0\b/.test(texto);
      const seg = desliga ? 0 : (tm ? tm.s : (/(\d+)/.exec(texto) ? parseInt(/(\d+)/.exec(texto)[1], 10) : 10));
      return { ...base, segundos: Math.min(21600, seg) };
    }
    case 'cargo_dar':
    case 'cargo_tirar':
      return { ...base, cargo: cargos[0] || null };
    case 'apelido': {
      const m = /(?:para|pra|:|como)\s+(.+)$/i.exec(String(bruto).replace(/<[@#&!]+\d+>/g, ' ').trim());
      return { ...base, apelido: m ? m[1].trim().slice(0, 32) : null };
    }
    case 'anunciar': {
      const cru = String(bruto).replace(/<[@&!]+\d+>/g, ' ').replace(/<#\d+>/g, ' ');
      const m = /:\s*([\s\S]+)$/.exec(cru);
      let msg = m ? m[1] : motivoDe(bruto, rx, { tirarTempo: false });
      msg = msg.replace(/^(?:no|em|na|para|pro|pra)\s+(?:canal\s+)?/i, '').trim();
      return { ...base, texto: msg.slice(0, 1500) };
    }
    default:
      return null;
  }
}

// A frase parece uma ordem? (a conversa usa isso para não responder "não entendi" a uma ordem)
const parece = (bruto) => ORDENS.some((o) => o.rx.test(sem(String(bruto).replace(/<[@#&!]+\d+>/g, ' ').replace(/^\s*atlas[\s,:;!-]*/i, ''))));

module.exports = { entender, parece, tempo, sem };
