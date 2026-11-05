// Extras do site: campos de parceria, pontos dos promotores, banner da recepção, categorias dos painéis de ticket
// e ações (criar / postar / apagar painel de ticket). Fica por cima do campos.js, sem alterá-lo.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder,
} = require('discord.js');
const db = require('../db');
const campos = require('./campos');
const Tkt = require('../ticket/nucleo');
const Par = require('../parceria/nucleo');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const MAX_PAINEIS = 10;
const MAX_TIPOS = 15;
const BANNER_RECEPCAO = 'config.recepcao.mensagens.boasVindas.banner';
const TIPOS_PADRAO = () => [{ nome: 'Atendimento', emoji: '🎫', desc: '' }];

// ---------- Campos extras ----------
function specs() {
  const lista = [];

  lista.push({
    grupo: 'Recepção', caminho: BANNER_RECEPCAO, tipo: 'url', max: 500, padrao: null,
    rotulo: 'Banner da mensagem de boas-vindas (link da imagem)',
    dica: 'Link direto de uma imagem (https://...). Vazio = sem banner. Links de anexos do Discord expiram.',
    depois: 'config.recepcao.mensagens.boasVindas.texto',
  });

  for (const tipo of ['entrada', 'saida']) {
    lista.push({
      grupo: 'Boas-vindas', caminho: `config.boasvindas.${tipo}.banner`, tipo: 'url', max: 500, padrao: null,
      rotulo: tipo === 'entrada' ? 'Banner da mensagem de boas-vindas (link da imagem)' : 'Banner da mensagem de saída (link da imagem)',
      dica: 'Link direto de uma imagem (https://...). Vazio = sem banner. Links de anexos do Discord expiram.',
      depois: `config.boasvindas.${tipo}.texto`,
    });
  }

  for (const [tipo, info] of Object.entries(Par.TIPOS)) {
    const g = 'Parcerias';
    const base = `config.parceria.${tipo}`;
    const nome = info.nome;
    lista.push({ grupo: g, caminho: `${base}.ativo`, rotulo: `${info.emoji} ${nome} — ligada`, tipo: 'bool', padrao: false });
    lista.push({ grupo: g, caminho: `${base}.canal`, rotulo: `${nome} — canal onde os convites são enviados`, tipo: 'canal', padrao: null });
    if (tipo !== 'everyone') {
      lista.push({ grupo: g, caminho: `${base}.cargo`, rotulo: `${nome} — cargo marcado`, tipo: 'cargo', padrao: null });
    }
    lista.push({ grupo: g, caminho: `${base}.banner`, rotulo: `${nome} — banner (link da imagem)`, tipo: 'url', max: 500, padrao: null, dica: 'Vazio = sem banner.' });
    lista.push({ grupo: g, caminho: `${base}.titulo`, rotulo: `${nome} — título`, tipo: 'texto', max: 200, permiteVazio: true, padrao: Par.PADROES[tipo].titulo, dica: 'Pode ficar vazio para não ter título.' });
    lista.push({ grupo: g, caminho: `${base}.texto`, rotulo: `${nome} — texto`, tipo: 'longo', max: 2000, padrao: Par.PADROES[tipo].texto, dica: `Variáveis: ${Par.VARIAVEIS} (também {membro} = {promotor})` });
    lista.push({ grupo: g, caminho: `${base}.semRepresentante`, rotulo: `${nome} — texto quando não há representante`, tipo: 'texto', max: 100, padrao: Par.SEM_REP, dica: 'Aparece no lugar de {representante} se o promotor não marcar ninguém junto do convite.' });
  }

  lista.push(...require('./extras-recepcao').specs());
  lista.push(...require('./extras-ajuda').specs());
  lista.push(...require('./extras-limpeza').specs());

  for (const p of Tkt.listaPaineis()) {
    lista.push({
      grupo: `Ticket · ${String(p.nome || p.id).slice(0, 24)}`,
      caminho: `config.ticket.paineis.${p.id}.tipos`,
      rotulo: 'Categorias do painel (botões)',
      tipo: 'tickettipos', maxItens: MAX_TIPOS, painelId: p.id, padrao: TIPOS_PADRAO(),
      dica: 'Depois de salvar, vá na aba "Painéis de ticket" e poste o painel de novo.',
      depois: `config.ticket.paineis.${p.id}.nome`,
    });
  }
  return lista;
}

const achar = (caminho) => specs().find((c) => c.caminho === caminho) || null;

// ---------- Validação ----------
function validar(c, v, guild) {
  const vazio = v === '' || v === null || v === undefined;
  switch (c.tipo) {
    case 'bool':
      return typeof v === 'boolean' ? { valor: v } : { erro: 'Valor inválido.' };
    case 'texto':
    case 'longo': {
      if (typeof v !== 'string') return { erro: 'Texto inválido.' };
      const t = v.trim();
      if (!t) return c.permiteVazio ? { valor: '' } : { remover: true };
      if (t.length > c.max) return { erro: `Máximo de ${c.max} caracteres.` };
      return { valor: t };
    }
    case 'numero': {
      const n = Number(v);
      if (vazio || !Number.isInteger(n) || n < c.min || n > c.max) return { erro: `Use um número inteiro de ${c.min} a ${c.max}.` };
      return { valor: n };
    }
    case 'url': {
      if (vazio) return { remover: true };
      const u = Par.bannerValido(String(v));
      return u ? { valor: u } : { erro: 'Link inválido. Use um link que comece com https://' };
    }
    case 'canal': {
      if (vazio) return { remover: true };
      const ch = guild.channels.cache.get(String(v));
      if (!ch || !TIPOS_TEXTO.includes(ch.type)) return { erro: 'Canal não encontrado (ou não é de texto).' };
      return { valor: ch.id };
    }
    case 'cargo': {
      if (vazio) return { remover: true };
      const r = guild.roles.cache.get(String(v));
      if (!r || r.id === guild.id || r.managed) return { erro: 'Cargo não encontrado (ou é de integração).' };
      return { valor: r.id };
    }
    case 'tickettipos': {
      if (!Array.isArray(v) || v.length < 1 || v.length > c.maxItens) return { erro: `Precisa ter de 1 a ${c.maxItens} categorias.` };
      const painel = Tkt.acharPainel(c.painelId);
      const existentes = new Set(((painel && painel.tipos) || []).map((t) => t.id));
      const usados = new Set();
      const lista = [];
      for (const t of v) {
        const nome = String((t && t.nome) || '').trim();
        const emoji = String((t && t.emoji) || '').trim();
        const desc = String((t && t.desc) || '').trim();
        if (!nome || nome.length > 40) return { erro: 'Toda categoria precisa de nome (até 40 caracteres).' };
        if (desc.length > 80) return { erro: 'A descrição pode ter até 80 caracteres.' };
        if (emoji && !Tkt.emojiValido(emoji)) return { erro: `Emoji inválido: "${emoji}".` };
        let id = t && existentes.has(t.id) && !usados.has(t.id) ? t.id : null;
        if (!id) id = Tkt.proximoIdTipo();
        usados.add(id);
        lista.push({ id, nome, emoji, desc });
      }
      return { valor: lista };
    }
    default:
      return { erro: 'Tipo de campo desconhecido.' };
  }
}

function aplicar(caminho, valor, guild) {
  const c = achar(caminho);
  if (!c) return { erro: 'Campo desconhecido.' };
  if (valor === null) {
    // Painel nunca fica sem categorias: "voltar ao padrão" recria a categoria inicial
    if (c.tipo === 'tickettipos') db.set(caminho, TIPOS_PADRAO().map((t) => ({ ...t, id: Tkt.proximoIdTipo() })));
    else db.remover(caminho);
    return { ok: true };
  }
  const r = validar(c, valor, guild);
  if (r.erro) return { erro: r.erro };
  if (r.remover) db.remover(caminho);
  else db.set(caminho, r.valor);
  return { ok: true };
}

// ---------- Ações dos painéis de ticket ----------
function linhasBotoes(tipos) {
  const rows = [];
  const lista = tipos.slice(0, MAX_TIPOS);
  for (let i = 0; i < lista.length; i += 5) {
    const row = new ActionRowBuilder();
    for (const t of lista.slice(i, i + 5)) {
      const b = new ButtonBuilder().setCustomId(`ticket:novo:${t.id}`).setLabel(t.nome.slice(0, 80)).setStyle(ButtonStyle.Primary);
      if (t.emoji) b.setEmoji(t.emoji);
      row.addComponents(b);
    }
    rows.push(row);
  }
  return rows;
}

const nomeMembro = (guild, uid) => {
  const m = guild.members.cache.get(uid);
  return m ? m.displayName : uid;
};

async function executarAcao(a, guild) {
  const tipo = a && a.tipo;
  const falha = (msg) => ({ tipo, ok: false, msg });
  const sucesso = (msg) => ({ tipo, ok: true, msg });

  if (tipo === 'ticket.criarPainel') {
    const nome = String(a.nome || '').trim();
    if (!nome || nome.length > 40) return falha('O nome do painel precisa ter de 1 a 40 caracteres.');
    if (Tkt.listaPaineis().length >= MAX_PAINEIS) return falha(`O máximo é ${MAX_PAINEIS} painéis.`);
    const id = Tkt.proximoIdPainel();
    db.set(`config.ticket.paineis.${id}`, {
      id, nome, criado: Date.now(),
      tipos: [{ id: Tkt.proximoIdTipo(), nome: 'Atendimento', emoji: '🎫', desc: '' }],
      staff: [],
    });
    return sucesso(`Painel "${nome}" criado! Ajuste na aba "Ticket · ${nome.slice(0, 24)}" e depois poste.`);
  }

  if (tipo === 'parceria.definirPontos') {
    const uid = String((a && a.userId) || '').trim();
    if (!/^\d{17,20}$/.test(uid)) return falha('ID de membro inválido. Use o ID numérico do Discord.');
    const n = Number(a.pontos);
    if (!Number.isInteger(n) || n < 0 || n > 100000) return falha('Os pontos precisam ser um número inteiro de 0 a 100000.');
    let m = guild.members.cache.get(uid) || null;
    if (n > 0) {
      m = m || (await guild.members.fetch(uid).catch(() => null));
      if (!m) return falha('Não achei esse membro no servidor.');
      if (m.user.bot) return falha('Bots não fazem parcerias.');
    }
    const antes = Par.pontosDe(uid);
    Par.definirPontos(uid, n);
    return sucesso(`${m ? m.displayName : uid}: ${antes} → ${n} parceria(s).${n === 0 ? ' (saiu do rank)' : ''}`);
  }

  const p = Tkt.acharPainel(String(a && a.painelId));

  if (tipo === 'ticket.removerPainel') {
    if (!p) return falha('Esse painel não existe mais.');
    db.remover(`config.ticket.paineis.${p.id}`);
    return sucesso(`Painel "${p.nome}" apagado. Tickets já abertos continuam funcionando.`);
  }

  if (tipo === 'ticket.postarPainel') {
    if (!p) return falha('Esse painel não existe mais.');
    const canal = guild.channels.cache.get(String(a.canalId));
    if (!canal || !TIPOS_TEXTO.includes(canal.type)) return falha('Escolha um canal de texto válido.');
    const tipos = (p.tipos || []).slice(0, MAX_TIPOS);
    if (!tipos.length) return falha('Esse painel não tem categorias.');
    const msg = Tkt.mensagem('painel', p);
    const desc = tipos.map((t) => `${t.emoji ? t.emoji + ' ' : ''}**${t.nome}**${t.desc ? ' — ' + t.desc : ''}`).join('\n');
    const embed = new EmbedBuilder().setColor(Tkt.COR).setTitle(msg.titulo).setDescription(`${msg.texto}\n\n${desc}`.slice(0, 4096));
    try {
      await canal.send({ embeds: [embed], components: linhasBotoes(tipos) });
    } catch (e) {
      return falha('Não consegui postar nesse canal. Confira se o Atlas pode enviar mensagens e links nele.');
    }
    db.set(`config.ticket.paineis.${p.id}.canal`, canal.id);
    return sucesso(`Painel "${p.nome}" postado em #${canal.name}.`);
  }

  return falha('Ação desconhecida.');
}

// ---------- Pedido do site ----------
async function processarPedido(pedido, guild) {
  const mud = pedido.mudancas && typeof pedido.mudancas === 'object' ? pedido.mudancas : {};
  const meus = new Set(specs().map((c) => c.caminho));
  const nossos = {};
  const outros = {};
  for (const [k, v] of Object.entries(mud)) (meus.has(k) ? nossos : outros)[k] = v;

  const resultado = campos.processarPedido({ ...pedido, mudancas: outros }, guild);
  for (const k of Object.keys(nossos).slice(0, 200)) {
    const r = aplicar(k, nossos[k], guild);
    if (r.ok) resultado.ok.push(k);
    else resultado.erros.push({ caminho: k, erro: r.erro });
  }

  resultado.acoes = [];
  const acoes = Array.isArray(pedido.acoes) ? pedido.acoes.slice(0, 5) : [];
  for (const a of acoes) {
    try {
      resultado.acoes.push(await executarAcao(a, guild));
    } catch (e) {
      resultado.acoes.push({ tipo: a && a.tipo, ok: false, msg: `Erro inesperado: ${e.message}` });
    }
  }
  return resultado;
}

// ---------- Estado publicado para o site ----------
function montarEstado(guild, resultado) {
  const estado = campos.montarEstado(guild, resultado);

  const extras = specs().map((c) => {
    const salvo = db.get(c.caminho, undefined);
    const padrao = c.padrao === undefined ? null : c.padrao;
    return {
      depois: c.depois,
      campo: {
        grupo: c.grupo, caminho: c.caminho, rotulo: c.rotulo, tipo: c.tipo, dica: c.dica || '',
        min: c.min, max: c.max, maxItens: c.maxItens,
        padrao, valor: salvo === undefined ? padrao : salvo, personalizado: salvo !== undefined,
      },
    };
  });

  // Os campos extras entram antes dos "Textos ·" (que são muitos) para as abas ficarem organizadas
  const ehTexto = (c) => String(c.grupo).startsWith('Textos ·');
  const base = estado.campos.filter((c) => !ehTexto(c));
  const textos = estado.campos.filter(ehTexto);
  const jaInseridos = {};
  for (const e of extras) {
    const i = e.depois ? base.findIndex((c) => c.caminho === e.depois) : -1;
    if (i >= 0) {
      const n = jaInseridos[e.depois] || 0;
      base.splice(i + 1 + n, 0, e.campo);
      jaInseridos[e.depois] = n + 1;
    } else base.push(e.campo);
  }
  estado.campos = [...base, ...textos];

  estado.paineis = Tkt.listaPaineis().map((p) => ({
    id: p.id, nome: p.nome, canal: p.canal || null, qtdTipos: (p.tipos || []).length,
  }));
  estado.limitePaineis = MAX_PAINEIS;

  const todosPromotores = Par.ranking(100000);
  estado.parceria = {
    variaveis: Par.VARIAVEIS,
    total: todosPromotores.reduce((soma, x) => soma + x.pontos, 0),
    ranking: todosPromotores.slice(0, 50).map((x) => ({
      id: x.uid, nome: nomeMembro(guild, x.uid), pontos: x.pontos, rank: Par.rankDe(x.uid),
    })),
  };
  return estado;
}

module.exports = { specs, processarPedido, montarEstado };
