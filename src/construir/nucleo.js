// ATLAS · assistente de construção: lê listas com variáveis e cria canais, categorias e cargos
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TIPOS = {
  categoria: ChannelType.GuildCategory, texto: ChannelType.GuildText, voz: ChannelType.GuildVoice,
  anuncio: ChannelType.GuildAnnouncement, forum: ChannelType.GuildForum, palco: ChannelType.GuildStageVoice, midia: ChannelType.GuildMedia,
};
const ICONE = { categoria: '📁', texto: '#️⃣', voz: '🔊', anuncio: '📢', forum: '💬', palco: '🎙️', midia: '🖼️' };
const ALIAS = {
  categoria: 'categoria', cat: 'categoria', categ: 'categoria', c: 'categoria',
  texto: 'texto', chat: 'texto', t: 'texto', canal: 'texto',
  voz: 'voz', call: 'voz', v: 'voz',
  anuncio: 'anuncio', anuncios: 'anuncio', aviso: 'anuncio', avisos: 'anuncio', news: 'anuncio',
  forum: 'forum', f: 'forum',
  palco: 'palco', stage: 'palco',
  midia: 'midia', media: 'midia',
};
const MINUSCULO = new Set(['texto', 'anuncio', 'forum', 'midia']); // o Discord põe esses em minúsculas com hífen
const sem = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const comLimite = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('TEMPO')), ms); })]).finally(() => clearTimeout(t)); };

function motivoErro(e) {
  if (e && e.message === 'TEMPO') return 'o Discord demorou demais';
  if (e && e.code === 50013) return 'sem permissão';
  if (e && e.code === 50035) return 'o Discord recusou (nome ou tipo inválido, ou servidor sem Comunidade para esse tipo)';
  if (e && e.code === 30013) return 'limite de canais do servidor';
  if (e && e.code === 30005) return 'limite de cargos do servidor';
  return (e && e.message ? e.message : 'erro').slice(0, 80);
}

function linhasDe(texto) {
  return String(texto || '').replace(/\r/g, '').replace(/```[a-zA-Z]*/g, '').split('\n').map((l) => l.replace(/^\s*[-*]\s+/, '').trim()).filter((l) => l && !l.startsWith('//'));
}

// ───────── Canais e categorias ─────────
// "{categoria} ╭━ INFO ━╮" / "{voz} 🔊・Sala" / "📢・avisos" (sem marca = texto). Canais ficam na última categoria acima.
function lerCanais(texto) {
  const itens = []; const problemas = []; let cat = null;
  for (const linha of linhasDe(texto)) {
    let tipo = 'texto', nome = linha;
    const m = /^([{[])\s*([^}\]]{1,20}?)\s*[}\]]\s*(.*)$/.exec(linha);
    if (m) {
      const t = ALIAS[sem(m[2])];
      if (t) { tipo = t; nome = m[3]; }
      else if (m[1] === '{') { problemas.push({ nome: linha, motivo: `marca {${m[2]}} desconhecida` }); continue; }
    }
    nome = nome.trim();
    if (MINUSCULO.has(tipo)) nome = nome.toLowerCase().replace(/\s+/g, '-');
    const tam = [...nome].length;
    if (!tam) { problemas.push({ nome: linha, motivo: 'sem nome' }); continue; }
    if (tam > 100) { problemas.push({ nome: linha.slice(0, 30), motivo: `nome com ${tam} caracteres (máximo 100)` }); continue; }
    itens.push({ tipo, nome, cat: tipo === 'categoria' ? null : cat });
    if (tipo === 'categoria') cat = itens.length - 1;
  }
  return { itens, problemas };
}

// Confere limites do Discord. Devolve { categorias, canais, erros[] }
function conferir(guild, itens, baseId) {
  const cats = itens.filter((i) => i.tipo === 'categoria').length;
  const canais = itens.length - cats;
  const erros = [];
  if (guild.channels.cache.size + itens.length > 500) erros.push(`O servidor tem ${guild.channels.cache.size} canais e o máximo é 500 (a lista traz ${itens.length}).`);
  const cont = new Map();
  for (const i of itens) if (i.tipo !== 'categoria') { const k = i.cat === null ? (baseId || '_') : i.cat; cont.set(k, (cont.get(k) || 0) + 1); }
  for (const [k, n] of cont) {
    const ja = typeof k === 'string' && k !== '_' ? [...guild.channels.cache.values()].filter((c) => c.parentId === k).length : 0;
    if (n + ja > 50) erros.push(`${k === '_' ? 'Sem categoria' : typeof k === 'string' ? 'A categoria escolhida' : `A categoria "${itens[k].nome}"`} passaria de 50 canais (o limite do Discord).`);
  }
  return { categorias: cats, canais, erros };
}

function arvore(itens, max = 30) {
  const linhas = [];
  for (const i of itens.slice(0, max)) linhas.push(`${i.tipo === 'categoria' ? '' : '　'}${ICONE[i.tipo]} ${i.nome}`);
  if (itens.length > max) linhas.push(`… e mais ${itens.length - max}`);
  return linhas;
}

async function criarCanais(guild, itens, { baseId = null, motivo, aoProgredir } = {}) {
  const ok = []; const falhas = []; const ids = new Map(); let n = 0;
  for (let k = 0; k < itens.length; k++) {
    const it = itens[k]; n++;
    let pai = null;
    if (it.tipo !== 'categoria') pai = it.cat === null ? baseId : ids.get(it.cat) || 'FALHOU';
    if (pai === 'FALHOU') falhas.push({ ...it, erro: 'a categoria não foi criada' });
    else {
      try {
        const c = await comLimite(guild.channels.create({ name: it.nome, type: TIPOS[it.tipo], ...(pai ? { parent: pai } : {}), reason: motivo }), 20000);
        ids.set(k, c.id); ok.push(it);
      } catch (e) { falhas.push({ ...it, erro: motivoErro(e) }); }
    }
    if (aoProgredir) { try { await aoProgredir(n, itens.length); } catch { /* só informativo */ } }
    await dormir(450);
  }
  return { ok, falhas };
}

// ───────── Cargos ─────────
// "✦ Staff {#ff5ac8} {separado} {mencionavel} {admin}" — as marcas ficam em qualquer lugar da linha
function lerCargos(texto) {
  const itens = []; const problemas = [];
  for (const linha of linhasDe(texto)) {
    const r = { cor: null, hoist: false, mentionable: false, admin: false };
    let erro = null;
    const nome = linha.replace(/\{\s*([^}]{1,30}?)\s*\}/g, (_, t) => {
      const s = sem(t).replace(/^cor\s*[=:]\s*/, '');
      let h = /^#?([0-9a-f]{6})$/.exec(s) || /^#?([0-9a-f]{3})$/.exec(s);
      if (h) { r.cor = h[1].length === 3 ? [...h[1]].map((x) => x + x).join('') : h[1]; return ''; }
      if (/^(separado|hoist|destacado)$/.test(s)) r.hoist = true;
      else if (/^(mencionavel|mention|mencionar)$/.test(s)) r.mentionable = true;
      else if (/^(admin|administrador)$/.test(s)) r.admin = true;
      else erro = `marca {${t}} desconhecida`;
      return '';
    }).replace(/\s+/g, ' ').trim();
    const tam = [...nome].length;
    if (erro) problemas.push({ nome: linha.slice(0, 30), motivo: erro });
    else if (!tam) problemas.push({ nome: linha.slice(0, 30), motivo: 'sem nome' });
    else if (tam > 100) problemas.push({ nome: linha.slice(0, 30), motivo: `nome com ${tam} caracteres (máximo 100)` });
    else itens.push({ nome, ...r });
  }
  return { itens, problemas };
}

const descCargo = (c) => `${c.cor ? `🎨#${c.cor}` : '⚪'} ${c.nome}${c.hoist ? ' · separado' : ''}${c.mentionable ? ' · mencionável' : ''}${c.admin ? ' · ⚠️admin' : ''}`;

async function criarCargos(guild, itens, { motivo, aoProgredir } = {}) {
  const ok = []; const falhas = []; let n = 0;
  for (const it of itens) {
    n++;
    try {
      const role = await comLimite(guild.roles.create({
        name: it.nome, ...(it.cor ? { color: parseInt(it.cor, 16) } : {}), hoist: it.hoist, mentionable: it.mentionable,
        ...(it.admin ? { permissions: [PermissionFlagsBits.Administrator] } : {}), reason: motivo,
      }), 20000);
      ok.push({ ...it, role });
    } catch (e) { falhas.push({ ...it, erro: motivoErro(e) }); }
    if (aoProgredir) { try { await aoProgredir(n, itens.length); } catch { /* só informativo */ } }
    await dormir(350);
  }
  // 1º da lista = mais alto, logo abaixo do cargo mais alto da Atlas
  let ordenado = true;
  if (ok.length > 1) {
    try {
      const topo = guild.members.me.roles.highest.position;
      await guild.roles.setPositions(ok.map((o, i) => ({ role: o.role.id, position: Math.max(1, topo - 1 - i) })));
    } catch { ordenado = false; }
  }
  return { ok, falhas, ordenado };
}

const EXEMPLO_CANAIS = `{categoria} ╭━━ INFORMAÇÕES ━━╮
{anuncio} 📢・avisos
{texto} 📜・regras
{texto} 👋・boas-vindas
{categoria} ╭━━ COMUNIDADE ━━╮
💬・chat-geral
{forum} 💡・sugestões
{voz} 🔊・Sala 1
{palco} 🎙️・Palco`;
const EXEMPLO_CARGOS = `👑 Dono {#ff5ac8} {separado} {admin}
✦ Staff {#9b59b6} {separado} {mencionavel}
✦ Membro {#99aab5}
✦ Novato`;

module.exports = { TIPOS, ICONE, lerCanais, conferir, arvore, criarCanais, lerCargos, descCargo, criarCargos, motivoErro, sem, dormir, comLimite, EXEMPLO_CANAIS, EXEMPLO_CARGOS };
