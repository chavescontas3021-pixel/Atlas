// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · ordens extras em português (parte 2 do interpretador)
//  Tickets, sorteios, eventos, canais, pânico, vigias, avisos, consultas e ausência.
//  É consultado ANTES do interprete.js: aqui os verbos vêm sempre com um substantivo
//  ("ticket", "sorteio", "canal"...), então não atrapalham as ordens simples.
// ─────────────────────────────────────────────────────────────
const { tempo } = require('./interprete');

// minúsculas sem acento, mantendo o mesmo tamanho do texto original (índices alinhados)
const fold = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CRIAR = '(?:cria|criar|crie|faz|fazer|abre|abrir|inicia|iniciar|comeca|comecar|bota|poe|monta|organiza|marca|agenda|quero|preciso de)';
const t = (re, f) => new RegExp(re).test(f);

function aposVerbo(cru, f, rx) { // texto depois do primeiro trecho que casa com rx
  const m = new RegExp(rx).exec(f);
  return m ? cru.slice(m.index + m[0].length) : cru;
}
const tiraTempo = (txt) => {
  const tm = tempo(txt);
  return tm ? txt.replace(new RegExp(tm.trecho.source.replace(/\\ /g, '\\s*'), 'i'), ' ') : txt;
};
const limpa = (s) => { let a = s, b; do { b = a; a = limpa1(b); } while (a !== b); return a; };
const limpa1 = (s) => s.replace(/\b(?:daqui(?: a)?|durante|dura|duracao|por|em|a|as|de|do|da|com|valendo|chamado|chamada|nome|de nome|o|um|uma)\b(?=\s*$)/gi, ' ').replace(/^[\s,:;.-]+|[\s,:;.-]+$/g, '').replace(/\s+/g, ' ').trim();
const numeroDe = (f) => { const m = /#?\b(\d{1,6})\b/.exec(f); return m ? parseInt(m[1], 10) : null; };

function entender({ bruto, usuarios = [], cargos = [], canais = [] }) {
  const cru = String(bruto).replace(/<[@#&!]+\d+>/g, ' ').replace(/^\s*atlas[\s,:;!-]*/i, '');
  const f = fold(cru);
  if (!f.trim()) return null;
  // "anuncia ...", "manda um aviso ...", "posta ...": o resto é o texto do anúncio, não uma ordem (fica com o interprete.js)
  if (/^\s*(?:anunci|manda (?:um )?(?:aviso|anuncio|recado)|posta\b|avisa (?:no|em|na)\b|diz (?:no|em|na)\b)/.test(f)) return null;
  const alvo = usuarios[0] || (String(bruto).match(/\b\d{17,20}\b/) || [null])[0];
  const canal = canais[0] || null;
  const tm = tempo(f);

  // 1) pânico
  if (t('\\bpanico\\b', f) && t('\\b(?:liga|ativa|ligar|ativar|entra)', f)) return { acao: 'panico_on' };
  if (t('\\bpanico\\b', f) && t('\\b(?:desliga|desativa|desligar|desativar|sai|acabou)', f)) return { acao: 'panico_off' };
  if (t('\\b(?:tranca|trancar|bloqueia|bloquear|fecha|fechar)\\b.*\\b(?:servidor|todos os canais|todos os chats)\\b|^\\s*(?:tranca|bloqueia|fecha) tudo\\s*[!.]*\\s*$', f)) return { acao: 'panico_on' };
  if (t('\\b(?:destranca|destrancar|desbloqueia|desbloquear|abre|abrir|libera|liberar)\\b.*\\b(?:servidor|todos os canais|todos os chats)\\b|^\\s*(?:destranca|desbloqueia|libera|abre) tudo\\s*[!.]*\\s*$', f)) return { acao: 'panico_off' };

  // 2) vigias
  if (t('\\bvigia|\\bvigil', f)) {
    const vigia = t('raid', f) ? 'raid' : t('flood|spam', f) ? 'flood' : t('golpe|scam|phishing', f) ? 'golpe' : null;
    const modo = t('\\b(?:desliga|desativa|desligar|desativar|tira|para)', f) ? 'off' : t('confirma', f) ? 'confirma' : t('\\b(?:liga|ativa|ligar|ativar|automatico)', f) ? 'auto' : null;
    if (vigia && modo) return { acao: 'vigia_modo', vigia, modo };
  }

  // 3) avisos de membro (plural: "avisos"; "dá um aviso" continua sendo advertir)
  if (alvo && t('\\bavisos\\b', f)) {
    if (t('\\b(?:limpa|limpar|zera|zerar|apaga|apagar|remove|remover|tira|tirar)\\b', f)) return { acao: 'avisos_limpar', alvo };
    return { acao: 'avisos_ver', alvo };
  }

  // 4) tickets
  if (t('\\btickets?\\b', f)) {
    if (t('\\b(?:renomeia|renomear|muda o nome|mudar o nome|troca o nome|trocar o nome)\\b', f)) {
      const m = /(?:\bpara|\bpra|:|\bcomo)\s+(.+)$/i.exec(cru);
      return { acao: 'tk_renomear', canal, nome: m ? m[1].trim() : '' };
    }
    if (alvo && t('\\b(?:remove|remover|tira|tirar|retira|retirar|expulsa|expulsar)\\b', f)) return { acao: 'tk_rem', alvo, canal };
    if (alvo && t('\\b(?:adiciona|adicionar|coloca|colocar|poe|puxa|chama|convida|bota|inclui|incluir|bota)\\b', f)) return { acao: 'tk_add', alvo, canal };
    if (t('\\b(?:fecha|fechar|encerra|encerrar|finaliza|finalizar|termina|terminar)\\b', f)) {
      const mot = /(?:motivo|porque|pq|:)\s*(.+)$/i.exec(cru);
      return { acao: 'tk_fechar', canal, motivo: mot ? mot[1].trim() : '' };
    }
  }

  // 5) sorteios
  if (t('\\bsorteio', f) || t('sorteia de novo|sortear de novo|novo vencedor|outro vencedor', f)) {
    const id = numeroDe(f);
    if (t('\\b(?:rerola|rerolar|refaz|refazer)\\b|de novo|novo vencedor|outro vencedor', f)) return { acao: 'sorteio_rerolar', id };
    if (t('\\b(?:encerra|encerrar|termina|terminar|finaliza|finalizar|acaba|acabar|fecha|fechar)\\b', f) && id) return { acao: 'sorteio_encerrar', id };
    if (t(`\\b${CRIAR}\\b`, f) || t('\\bsorteio de\\b', f)) {
      let resto = aposVerbo(cru, f, 'sorteio');
      let ms = (tm ? tm.s : 86400) * 1000;
      const vv = /(\d{1,2})\s*(?:vencedores|vencedor|ganhadores|ganhador)/i.exec(fold(resto));
      if (vv) resto = resto.replace(new RegExp(vv[0].replace(/\s+/g, '\\s*'), 'i'), ' ');
      resto = limpa(tiraTempo(resto).replace(/\b(?:para|pra)\s+\d.*$/i, ' ')).replace(/^(?:(?:de|do|da|com|valendo|premio|:)\s+)+/i, '').trim();
      return { acao: 'sorteio_criar', canal, premio: resto, ms, vencedores: vv ? parseInt(vv[1], 10) : 1 };
    }
  }

  // 6) eventos
  if (t('\\bevento\\b', f) && t(`\\b${CRIAR}\\b`, f)) {
    let resto = aposVerbo(cru, f, '\\bevento\\b');
    resto = limpa(tiraTempo(resto).replace(/\b(?:que )?(?:comeca|começa)\b/gi, ' ')).replace(/^(?:chamado|chamada|de nome|nome|:)\s*/i, '').trim();
    return { acao: 'evento_criar', canal, titulo: resto, ms: (tm ? tm.s : 86400) * 1000 };
  }

  // 7) canais movimentados (isentos do vigia de flood)
  if (t('movimentad|\\blivres?\\b|lotad|bombad', f) && (t('\\bcanal|\\bcanais', f) || canal)) {
    if (t('\\bquais\\b|\\blista|\\bmostra', f)) return { acao: 'canais_livres_ver' };
    if (canal && t('\\b(?:tira|tirar|remove|remover|desmarca|desmarcar|nao e mais|deixa de ser)\\b', f)) return { acao: 'canal_livre_tirar', canal };
    if (canal) return { acao: 'canal_livre', canal };
  }

  // 8) canais
  if (t('\\bcanal\\b', f)) {
    if (t('\\b(?:apaga|apagar|deleta|deletar|exclui|excluir|remove|remover|destroi)\\b', f) && !t('mensage|msg', f)) return { acao: 'canal_apagar', canal };
    if (t('\\b(?:renomeia|renomear|muda o nome|mudar o nome|troca o nome|trocar o nome)\\b', f)) {
      const m = /(?:\bpara|\bpra|:|\bcomo)\s+(.+)$/i.exec(cru);
      return { acao: 'canal_renomear', canal, nome: m ? m[1].trim() : '' };
    }
    if (t('\\b(?:cria|criar|crie|faz|fazer|monta|bota|poe|quero|preciso de)\\b', f) || t('\\b(?:abre|abrir)\\b.*\\b(?:um|uma|novo|nova|chamado)\\b', f)) {
      const voz = t('\\bvoz\\b|\\bcall\\b', f);
      const m = /(?:chamado|chamada|com o nome|de nome|nome|:)\s+(.+)$/i.exec(cru);
      const nome = m ? m[1] : limpa(aposVerbo(cru, f, '\\bcanal\\b').replace(/\b(?:de|do)\s+(?:texto|voz)\b/gi, ' ').replace(/\b(?:texto|voz|novo|nova)\b/gi, ' '));
      return { acao: 'canal_criar', nome: nome.trim(), voz };
    }
  }

  // 9) consultas
  if (alvo && t('\\b(?:quem e|info|informacoes|ficha|perfil|dados|historico|investiga|stalkeia)\\b', f)) return { acao: 'membro_info', alvo };
  if (t('\\b(?:resumo|resume|me atualiza|relatorio|novidades)\\b|o que (?:rolou|aconteceu)', f)) return { acao: 'resumo', dias: t('semana|7 dias', f) ? 7 : t('\\bmes\\b|30 dias', f) ? 30 : 1 };
  if (t('\\bconselhos?\\b|analisa o servidor|analise do servidor|como (?:esta|ta) o servidor|checa o servidor', f)) return { acao: 'conselho' };
  if (t('^\\s*status\\s*$|status d[aoe] (?:sub ?dona|atlas|modo)|como (?:esta|ta) a sub ?dona|situacao d[aoe] (?:sub ?dona|atlas)', f)) return { acao: 'status_sd' };
  if (t('\\b(?:caixa|extrato)\\b|quanto (?:eu )?(?:recebi|entrou|ganhei)|sonhos recebidos', f)) return { acao: 'caixa_ver' };
  if (t('\\brecados\\b|\\b(?:quem|alguem)\\b.{0,12}\\b(?:me )?(?:procurou|chamou|marcou|perguntou por mim)|me procuraram|\\b(?:tem|algum|alguma|mostra|ver|ve|cade|quais)\\b.{0,20}\\brecado\\b|\\brecado\\b.{0,12}\\bpra mim\\b|\\bpara mim\\b.{0,10}\\brecado', f)) return { acao: 'recados_ver' };
  if (t('\\bdiario\\b|o que (?:voce|vc) (?:ja )?fez', f)) return { acao: 'diario_ver' };

  // 10) ausência
  if (t('vou (?:ficar )?(?:ausente|fora|viajar|sumir)|fico ausente|to ausente|estou ausente|modo ausente|me ausent', f)) {
    const mot = /(?:motivo|porque|pq|:)\s*(.+)$/i.exec(cru);
    return { acao: 'ausentar', horas: tm ? Math.max(1, Math.round(tm.s / 3600)) : null, motivo: mot ? mot[1].trim().slice(0, 150) : '' };
  }
  if (t('\\b(?:voltei|to de volta|estou de volta|voltando)\\b', f)) return { acao: 'voltar_ordem' };
  return null;
}

const parece = (bruto) => Boolean(entender({ bruto }));

module.exports = { entender, parece };
