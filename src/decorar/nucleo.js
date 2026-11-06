// Núcleo do /decorar: monta a lista de canais com ID para o staff editar.
const { ChannelType } = require('discord.js');

const VOZ = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);
const LIMITE_MSG = 1850; // cabe num bloco de código dentro do limite de 2000 do Discord
const RE_LINHA = /^\s*(\d{17,20})\s*\|\s*(.*)$/; // "ID | nome"

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

module.exports = { RE_LINHA, canaisDecoraveis, montarLista, dividir };
