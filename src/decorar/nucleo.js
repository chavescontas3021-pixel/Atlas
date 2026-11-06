// Núcleo do /decorar: lista os canais, lê a lista editada e renomeia em lote.
const { ChannelType } = require('discord.js');
const db = require('../db');

const VOZ = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
// Canais de texto viram minúsculos e com hífen no lugar de espaço (o Discord faz o mesmo)
const TEXTO = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia]);
const LIMITE_MSG = 1850; // cabe num bloco de código dentro do limite de 2000 do Discord
const RE_LINHA = /^\s*(\d{17,20})\s*\|\s*(.*)$/; // "ID | nome"

const ESPERA_ENTRE = 600; // pausa entre um canal e outro (ms)
const LIMITE_POR_CANAL = 20000; // se o Discord segurar um canal por mais que isso, segue para o próximo
const PAUSA_LOGS = 'decorar.pausaLogsAte'; // os logs de canal ficam parados até esse horário
const BACKUP = 'decorar.backup'; // { idDoCanal: { original, em } }

// ---------- Lista ----------

// Canais que entram na lista: tudo, menos categorias e threads
function canaisDecoraveis(guild) {
  return [...guild.channels.cache.values()].filter((c) => c.type !== ChannelType.GuildCategory && !c.isThread());
}

// Mesma ordem que o Discord mostra: texto primeiro, voz depois, cada um pela posição
function ordemCanais(a, b) {
  const va = VOZ.has(a.type) ? 1 : 0;
  const vb = VOZ.has(b.type) ? 1 : 0;
  if (va !== vb) return va - vb;
  return a.rawPosition - b.rawPosition;
}

// Devolve { linhas, total }: o título de cada categoria e, embaixo, "ID | nome" de cada canal
function montarLista(guild) {
  const canais = canaisDecoraveis(guild);
  const porCategoria = new Map(); // parentId (ou null) -> canais
  for (const c of canais) {
    const k = c.parentId || null;
    if (!porCategoria.has(k)) porCategoria.set(k, []);
    porCategoria.get(k).push(c);
  }

  const grupos = [];
  if (porCategoria.has(null)) grupos.push({ titulo: '— sem categoria —', canais: porCategoria.get(null) });
  const categorias = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory && porCategoria.has(c.id))
    .sort((a, b) => a.rawPosition - b.rawPosition);
  for (const cat of categorias) grupos.push({ titulo: cat.name, canais: porCategoria.get(cat.id) });

  const linhas = [];
  for (const g of grupos) {
    if (linhas.length) linhas.push('');
    linhas.push(g.titulo);
    for (const c of g.canais.sort(ordemCanais)) linhas.push(`${c.id} | ${c.name}`);
  }
  return { linhas, total: canais.length };
}

// Divide as linhas em pedaços que cabem numa mensagem (sempre quebrando entre linhas)
function dividir(linhas, limite = LIMITE_MSG) {
  const pedacos = [];
  let atual = [];
  let tam = 0;
  for (const l of linhas) {
    const custo = l.length + 1;
    if (atual.length && tam + custo > limite) {
      pedacos.push(atual.join('\n'));
      atual = [];
      tam = 0;
    }
    atual.push(l);
    tam += custo;
  }
  if (atual.length) pedacos.push(atual.join('\n'));
  return pedacos;
}

// ---------- Ler a lista editada ----------

// Pega só as linhas "ID | nome". Títulos de categoria, linhas vazias e ``` são ignorados.
function lerLinhas(texto) {
  const limpo = String(texto || '').replace(/\r/g, '').replace(/```[a-zA-Z]*/g, '');
  const pedidos = new Map(); // id -> nome (se o ID repetir, vale a última linha)
  for (const linha of limpo.split('\n')) {
    const m = RE_LINHA.exec(linha);
    if (m) pedidos.set(m[1], m[2].trim());
  }
  return pedidos;
}

function normalizarNome(canal, nome) {
  const n = String(nome).trim();
  return TEXTO.has(canal.type) ? n.toLowerCase().replace(/\s+/g, '-') : n;
}

// Compara a lista com o servidor. Devolve { mudancas, iguais, problemas, lidas }
function interpretar(guild, texto) {
  const pedidos = lerLinhas(texto);
  const mudancas = [];
  const problemas = [];
  let iguais = 0;

  for (const [id, nomeBruto] of pedidos) {
    const canal = guild.channels.cache.get(id);
    if (!canal) {
      problemas.push({ nome: id, motivo: 'canal não encontrado' });
      continue;
    }
    if (canal.type === ChannelType.GuildCategory || canal.isThread()) {
      problemas.push({ nome: canal.name, motivo: 'categorias e threads não são renomeadas' });
      continue;
    }
    const alvo = normalizarNome(canal, nomeBruto);
    const tam = [...alvo].length;
    if (tam < 1) {
      problemas.push({ nome: canal.name, motivo: 'sem nome depois do |' });
      continue;
    }
    if (tam > 100) {
      problemas.push({ nome: canal.name, motivo: `nome com ${tam} caracteres (máximo 100)` });
      continue;
    }
    if (alvo === canal.name) {
      iguais++;
      continue;
    }
    if (canal.manageable === false) {
      problemas.push({ nome: canal.name, motivo: 'o Atlas não consegue editar esse canal' });
      continue;
    }
    mudancas.push({ id, antes: canal.name, depois: alvo });
  }
  return { mudancas, iguais, problemas, lidas: pedidos.size };
}

// ---------- Renomear em lote ----------

let ocupado = false;
const estaOcupado = () => ocupado;
function reservar() {
  if (ocupado) return false;
  ocupado = true;
  return true;
}
const liberar = () => {
  ocupado = false;
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function comLimite(promessa, ms) {
  let t;
  const tempo = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error('TEMPO')), ms);
  });
  return Promise.race([promessa, tempo]).finally(() => clearTimeout(t));
}

function motivoErro(e) {
  if (e && e.message === 'TEMPO') return 'o Discord segurou (limite de 2 renomeações a cada 10 min)';
  if (e && e.code === 50013) return 'sem permissão';
  if (e && e.code === 10003) return 'o canal não existe mais';
  if (e && e.code === 50035) return 'o Discord recusou esse nome';
  return (e && e.message ? e.message : 'erro desconhecido').slice(0, 80);
}

// Os logs de canal consultam isto antes de registrar mudanças de nome
function logsPausados() {
  return Date.now() < db.get(PAUSA_LOGS, 0);
}

// Quem chama precisa ter feito reservar() antes e liberar() depois.
// Devolve { ok: [...], falhas: [{ ..., erro }] }
async function renomearLote(guild, mudancas, { motivo, aoProgredir } = {}) {
  const ok = [];
  const falhas = [];
  try {
    let i = 0;
    for (const m of mudancas) {
      i++;
      db.set(PAUSA_LOGS, Date.now() + 120000); // janela que vai renovando enquanto aplica
      const canal = guild.channels.cache.get(m.id);
      if (!canal) {
        falhas.push({ ...m, erro: 'o canal não existe mais' });
      } else if (canal.name === m.depois) {
        ok.push(m);
      } else {
        try {
          await comLimite(canal.setName(m.depois, motivo), LIMITE_POR_CANAL);
          ok.push(m);
        } catch (e) {
          falhas.push({ ...m, erro: motivoErro(e) });
        }
      }
      if (aoProgredir) {
        try {
          await aoProgredir(i, mudancas.length);
        } catch {
          /* progresso é só informativo */
        }
      }
      await dormir(ESPERA_ENTRE);
    }
  } finally {
    db.set(PAUSA_LOGS, Date.now() + 15000); // folga para eventos que chegam atrasados
  }
  return { ok, falhas };
}

// ---------- Backup e desfazer ----------

// Guarda o nome original de cada canal. Se o canal já tem backup, mantém o mais antigo.
function guardarBackup(mudancas) {
  const b = db.get(BACKUP, {}) || {};
  for (const m of mudancas) if (!b[m.id]) b[m.id] = { original: m.antes, em: Date.now() };
  db.set(BACKUP, b);
}

// Monta o que precisa voltar ao nome original
function prepararDesfazer(guild) {
  const b = db.get(BACKUP, {}) || {};
  const mudancas = [];
  const resolvidos = []; // já estão no nome original ou o canal sumiu
  for (const [id, info] of Object.entries(b)) {
    const canal = guild.channels.cache.get(id);
    if (!canal || canal.name === info.original) resolvidos.push(id);
    else mudancas.push({ id, antes: canal.name, depois: info.original });
  }
  return { mudancas, resolvidos };
}

// Tira do backup o que já foi resolvido
function limparBackup(ids) {
  const b = db.get(BACKUP, {}) || {};
  for (const id of ids) delete b[id];
  db.set(BACKUP, b);
}

module.exports = {
  RE_LINHA,
  canaisDecoraveis,
  montarLista,
  dividir,
  lerLinhas,
  interpretar,
  estaOcupado,
  reservar,
  liberar,
  renomearLote,
  logsPausados,
  guardarBackup,
  prepararDesfazer,
  limparBackup,
};
