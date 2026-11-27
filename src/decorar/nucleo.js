const { ChannelType } = require('discord.js');
const db = require('../db');

const VOZ = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
const TEXTO = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia]);
const LIMITE_MSG = 1850;
const RE_LINHA = /^\s*(\d{17,20})\s*\|\s*(.*)$/;

const ESPERA_ENTRE = 600;
const LIMITE_POR_CANAL = 20000;
const PAUSA_LOGS = 'decorar.pausaLogsAte';
const BACKUP = 'decorar.backup';

function canaisDecoraveis(guild) {
  return [...guild.channels.cache.values()].filter((c) => c.type !== ChannelType.GuildCategory && !c.isThread());
}

function ordemCanais(a, b) {
  const va = VOZ.has(a.type) ? 1 : 0;
  const vb = VOZ.has(b.type) ? 1 : 0;
  if (va !== vb) return va - vb;
  return a.rawPosition - b.rawPosition;
}

function montarLista(guild) {
  const canais = canaisDecoraveis(guild);
  const porCategoria = new Map();
  for (const c of canais) {
    const k = c.parentId || null;
    if (!porCategoria.has(k)) porCategoria.set(k, []);
    porCategoria.get(k).push(c);
  }

  const grupos = [];
  if (porCategoria.has(null)) grupos.push({ titulo: '— sem categoria —', canais: porCategoria.get(null) });
  const categorias = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);
  for (const cat of categorias) grupos.push({ id: cat.id, titulo: cat.name, canais: porCategoria.get(cat.id) || [] });

  const linhas = [];
  for (const g of grupos) {
    if (linhas.length) linhas.push('');
    linhas.push(g.id ? `${g.id} | ${g.titulo}` : g.titulo);
    for (const c of g.canais.sort(ordemCanais)) linhas.push(`${c.id} | ${c.name}`);
  }
  return { linhas, total: canais.length };
}

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

function lerLinhas(texto) {
  const limpo = String(texto || '').replace(/\r/g, '').replace(/```[a-zA-Z]*/g, '');
  const pedidos = new Map();
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
    if (canal.isThread()) {
      problemas.push({ nome: canal.name, motivo: 'threads não são renomeadas' });
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

function logsPausados() {
  return Date.now() < db.get(PAUSA_LOGS, 0);
}

async function renomearLote(guild, mudancas, { motivo, aoProgredir } = {}) {
  const ok = [];
  const falhas = [];
  try {
    let i = 0;
    for (const m of mudancas) {
      i++;
      db.set(PAUSA_LOGS, Date.now() + 120000);
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
        }
      }
      await dormir(ESPERA_ENTRE);
    }
  } finally {
    db.set(PAUSA_LOGS, Date.now() + 15000);
  }
  return { ok, falhas };
}

function guardarBackup(mudancas) {
  const b = db.get(BACKUP, {}) || {};
  for (const m of mudancas) if (!b[m.id]) b[m.id] = { original: m.antes, em: Date.now() };
  db.set(BACKUP, b);
}

function prepararDesfazer(guild) {
  const b = db.get(BACKUP, {}) || {};
  const mudancas = [];
  const resolvidos = [];
  for (const [id, info] of Object.entries(b)) {
    const canal = guild.channels.cache.get(id);
    if (!canal || canal.name === info.original) resolvidos.push(id);
    else mudancas.push({ id, antes: canal.name, depois: info.original });
  }
  return { mudancas, resolvidos };
}

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
