// Controle de vagas da house: lista de vagas, quem ocupa, pedidos e painel.
// (Versão em arquivo único: já inclui a correção da vaga ocupada contada como livre.)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');
const P = require('./personagens');

// ===== util =====
// Utilidades do sistema de vagas: cor, textos padrão, configuração e normalização de texto.

const COR = 0xf5a3c7;

const PADROES = {
  mensagens: {
    painel: {
      titulo: '📋 Vagas da house',
      texto: 'Veja abaixo os personagens que já têm dono.\nQualquer personagem que não esteja aqui está livre! Para pedir um, use `/vaga pedir` e busque pelo nome.',
    },
  },
};

const cfg = (chave, padrao) => db.get(`config.vagas.${chave}`, padrao);
const mensagem = (tipo) => ({ ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) });
const limite = () => Number(cfg('limite', 1));

function norm(txt) {
  return String(txt || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_*~`|]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== banco =====
// Leitura e gravação das vagas e dos pedidos no banco.

const todas = () => Object.values(db.get('vagas.lista', {}) || {}).sort((a, b) => Number(a.id) - Number(b.id));
const obter = (id) => db.get(`vagas.lista.${id}`, null);
const salvar = (v) => db.set(`vagas.lista.${v.id}`, v);
const apagar = (id) => db.remover(`vagas.lista.${id}`);
const doUsuario = (uid) => todas().filter((v) => v.ocupanteId === uid);

function proximoId() {
  const n = db.get('vagas.contador', 0) + 1;
  db.set('vagas.contador', n);
  return String(n);
}

const pedidos = () => Object.values(db.get('vagas.pedidos', {}) || {});
const pedido = (id) => db.get(`vagas.pedidos.${id}`, null);

function proximoPedido() {
  const n = db.get('vagas.contadorPedidos', 0) + 1;
  db.set('vagas.contadorPedidos', n);
  return String(n);
}

// Acha pelo id ou pelo nome exato (usado pelos comandos que recebem o id do autocomplete)
function acharVaga(ref) {
  if (!ref) return null;
  const r = norm(ref);
  return todas().find((v) => v.id === String(ref) || norm(v.nome) === r) || null;
}

// ===== identidade =====
// Quem é "o mesmo personagem". É aqui que mora a correção do bug da vaga ocupada contada como livre.
//
// Antes, a recepção cadastrava por nome (sem obra) e o /vaga pedir por AniList (nome + obra).
// Os dois nunca se reconheciam: a vaga ocupada ficava invisível e o personagem aparecia como livre.
// Agora todo mundo usa mesmoPersonagem(), que ignora ordem das palavras, acento e obra em branco.

// Chave estável de um personagem: AniList (al:123) ou manual (m:nome|obra)
const chaveManual = (nome, obra) => `m:${norm(nome)}|${norm(obra)}`;

// "Naruto Uzumaki" e "Uzumaki Naruto" viram a mesma coisa
const cacheBase = new Map();
function nomeBase(nome) {
  const k = String(nome || '');
  let b = cacheBase.get(k);
  if (b === undefined) {
    b = norm(k).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
    if (cacheBase.size > 5000) cacheBase.clear();
    cacheBase.set(k, b);
  }
  return b;
}

// a e b são { ext, nome, grupo }. Na dúvida (obra em branco) trata como o mesmo personagem:
// é melhor mostrar "ocupado" por engano do que entregar um personagem que já tem dono.
function mesmoPersonagem(a, b) {
  if (!a || !b) return false;
  if (a.ext && b.ext) {
    if (a.ext === b.ext) return true;
    if (a.ext.startsWith('al:') && b.ext.startsWith('al:')) return false; // ids diferentes no AniList = personagens diferentes
  }
  const nome = nomeBase(a.nome);
  if (!nome || nome !== nomeBase(b.nome)) return false;
  const ga = norm(a.grupo);
  const gb = norm(b.grupo);
  return !ga || !gb || ga === gb;
}

const acharTodos = (alvo) => todas().filter((v) => mesmoPersonagem(v, alvo));

// Se existir mais de uma entrada do personagem, devolve a OCUPADA primeiro.
function acharPorChave(chave, nome, grupo) {
  const iguais = acharTodos({ ext: chave, nome, grupo });
  return iguais.find((v) => v.ocupanteId) || iguais[0] || null;
}

// Livre de verdade: sem dono e sem nenhuma entrada gêmea ocupada
function estaLivre(vaga) {
  if (vaga.ocupanteId) return false;
  return !acharTodos(vaga).some((v) => v.ocupanteId);
}

function livres() {
  const lista = todas();
  const ocupadas = lista.filter((v) => v.ocupanteId);
  return lista.filter((v) => !v.ocupanteId && !ocupadas.some((o) => mesmoPersonagem(o, v)));
}

// ===== painel =====
// Painel fixo de vagas (embeds paginados que se atualizam sozinhos).

const LIMITE_PAGINA = 3600;

// Entradas que aparecem no painel: some a entrada "livre" que é gêmea de uma ocupada
function listaDoPainel() {
  const lista = todas();
  const ocupadas = lista.filter((v) => v.ocupanteId);
  return lista.filter((v) => v.ocupanteId || !ocupadas.some((o) => mesmoPersonagem(o, v)));
}

// Divide a lista em páginas de texto: um bloco por obra, com o placar "ocupadas/total"
function paginasPainel(lista) {
  const ordenada = lista.slice().sort((a, b) => norm(a.grupo || 'geral').localeCompare(norm(b.grupo || 'geral')) || norm(a.nome).localeCompare(norm(b.nome)));
  const tot = new Map();
  const oc = new Map();
  for (const v of lista) {
    const g = v.grupo || 'Geral';
    tot.set(g, (tot.get(g) || 0) + 1);
    if (v.ocupanteId) oc.set(g, (oc.get(g) || 0) + 1);
  }
  const titulo = (g, cont) => `**${g}**${cont ? ' (cont.)' : ` · ${oc.get(g) || 0}/${tot.get(g)} ocupadas`}\n`;
  const paginas = [];
  let atual = '';
  let grupoAtual = null;
  const empurra = () => { if (atual) paginas.push(atual); atual = ''; };
  for (const v of ordenada) {
    const g = v.grupo || 'Geral';
    const linha = v.ocupanteId ? `🔴 **${v.nome}** — <@${v.ocupanteId}>` : `🟢 ${v.nome} — *livre*`;
    const troca = g !== grupoAtual;
    let cont = false;
    if (atual && atual.length + (troca ? titulo(g, false).length : 0) + linha.length + 2 > LIMITE_PAGINA) {
      empurra();
      cont = !troca;
    }
    if (troca || cont) {
      atual += `${atual ? '\n' : ''}${titulo(g, cont)}`;
      grupoAtual = g;
    }
    atual += `${linha}\n`;
  }
  empurra();
  return paginas;
}

// Contagem geral (usada no painel, no /vaga lista e no /vaga buscar)
function resumo() {
  const lista = listaDoPainel();
  const ocupadas = lista.filter((v) => v.ocupanteId).length;
  return { ocupadas, livres: lista.length - ocupadas, total: lista.length };
}

// Lista de embeds do painel (cada uma vira uma mensagem; o limite do Discord é por mensagem)
function embedsPainel() {
  const m = mensagem('painel');
  const lista = listaDoPainel();
  const paginas = paginasPainel(lista);
  const r = resumo();
  const placar = `🔴 **${r.ocupadas}** ocupadas  ·  🟢 **${r.livres}** livres na lista`;
  if (!paginas.length) {
    return [new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(`${String(m.texto).slice(0, 600)}\n\nNenhum personagem ocupado ainda.`).setTimestamp()];
  }
  return paginas.map((txt, i) => {
    const e = new EmbedBuilder().setColor(COR).setDescription(i === 0 ? `${String(m.texto).slice(0, 400)}\n\n${placar}\n\n${txt}` : txt).setTimestamp();
    if (i === 0) e.setTitle(m.titulo);
    if (paginas.length > 1) e.setFooter({ text: `Página ${i + 1}/${paginas.length}` });
    return e;
  });
}
const embedPainel = () => embedsPainel()[0];

async function atualizarPainel(guild) {
  const canalId = cfg('canalPainel');
  if (!canalId) return false;
  const canal = guild.channels.cache.get(canalId);
  if (!canal) return false;
  const embeds = embedsPainel();
  let ids = cfg('painelMsgIds') || (cfg('painelMsgId') ? [cfg('painelMsgId')] : []);
  if (cfg('painelCanalId') !== canalId) ids = [];
  const novos = [];
  for (let i = 0; i < embeds.length; i++) {
    const payload = { embeds: [embeds[i]], allowedMentions: { parse: [] } };
    const msg = ids[i] ? await canal.messages.fetch(ids[i]).catch(() => null) : null;
    if (msg) {
      await msg.edit(payload).catch(() => {});
      novos.push(msg.id);
      continue;
    }
    try {
      const nova = await canal.send(payload);
      novos.push(nova.id);
    } catch {
      return false;
    }
  }
  for (const extra of ids.slice(embeds.length)) {
    const m = await canal.messages.fetch(extra).catch(() => null);
    if (m) await m.delete().catch(() => {});
  }
  db.set('config.vagas.painelMsgIds', novos);
  db.set('config.vagas.painelCanalId', canal.id);
  db.remover('config.vagas.painelMsgId');
  return true;
}

// Procura personagens pelo nome ou obra (para o /vaga buscar). Esconde cópias livres de uma ocupada.
function buscar(texto) {
  const q = norm(texto);
  if (q.length < 2) return [];
  const base = nomeBase(texto);
  const achados = [];
  for (const v of todas()) {
    const bate = norm(v.nome).includes(q) || norm(v.grupo).includes(q) || (base && nomeBase(v.nome) === base);
    if (!bate) continue;
    const dono = v.ocupanteId ? v : acharTodos(v).find((o) => o.ocupanteId) || null;
    if (!v.ocupanteId && dono) continue;
    achados.push({ vaga: v, livre: !dono, donoId: dono ? dono.ocupanteId : null });
  }
  return achados.sort((a, b) => Number(a.livre) - Number(b.livre)).slice(0, 10);
}

// ---------- Organização em massa ----------
const dorme = (ms) => new Promise((r) => setTimeout(r, ms));
const semObra = () => todas().filter((v) => !v.grupo);

// Procura no AniList a obra das vagas que estão sem obra. Só aceita quando o nome bate inteiro e
// existe um único personagem com ele; o resto vai para a lista manual. aplicar=false só mostra.
async function organizarAuto({ aplicar = false, max = 120 } = {}) {
  const pendentes = semObra();
  const rel = { total: pendentes.length, lidas: 0, certas: [], ambiguas: [], sem: [] };
  for (const v of pendentes.slice(0, max)) {
    rel.lidas++;
    const base = nomeBase(v.nome);
    const achados = await P.buscar(v.nome, 4000);
    const exatos = achados.filter((c) => nomeBase(c.nome) === base);
    if (exatos.length === 1) {
      const c = exatos[0];
      rel.certas.push({ vaga: v, obra: c.obra });
      if (aplicar) {
        const repetido = todas().some((o) => o.id !== v.id && o.ext === c.chave);
        v.grupo = c.obra;
        if (!v.foto && c.foto) v.foto = c.foto;
        if (!repetido && (!v.ext || !v.ext.startsWith('al:'))) v.ext = c.chave;
        salvar(v);
      }
    } else if (exatos.length > 1) {
      rel.ambiguas.push({ vaga: v, obras: [...new Set(exatos.map((c) => c.obra))].slice(0, 3) });
    } else {
      rel.sem.push(v);
    }
    await dorme(650); // respeita o limite do AniList
  }
  return rel;
}

// Texto "Nome = Obra" (uma por linha) -> preenche a obra das vagas com esse nome
function definirObras(texto) {
  const rel = { feitas: 0, naoAchadas: [], invalidas: 0 };
  for (const linha of String(texto || '').split(/\r?\n/)) {
    const t = linha.trim();
    if (!t || /[=|;]\s*$/.test(t)) continue; // linha ainda sem obra: ignora
    const m = /^(.+?)\s*[=|;]\s*(.+)$/.exec(t);
    if (!m) { rel.invalidas++; continue; }
    const obra = m[2].trim().slice(0, 40);
    const achadas = todas().filter((v) => nomeBase(v.nome) === nomeBase(m[1]));
    if (!achadas.length) { rel.naoAchadas.push(m[1].trim().slice(0, 30)); continue; }
    for (const v of (achadas.filter((x) => !x.grupo).length ? achadas.filter((x) => !x.grupo) : achadas)) {
      v.grupo = obra;
      salvar(v);
      rel.feitas++;
    }
  }
  return rel;
}

// ===== ocupacao =====
// Ocupar e liberar vagas (e o cargo de ocupante).

async function mexerCargo(guild, userId, dar) {
  const cargoId = cfg('cargo');
  if (!cargoId) return;
  const membro = await guild.members.fetch(userId).catch(() => null);
  if (!membro) return;
  if (dar) {
    await membro.roles.add(cargoId).catch(() => {});
  } else if (doUsuario(userId).length === 0) {
    await membro.roles.remove(cargoId).catch(() => {}); // só tira se não sobrou nenhuma vaga
  }
}

// Devolve { ok: true } ou { ok: false, por, vaga } quando o personagem já tem dono (nesta entrada ou numa gêmea).
async function ocupar(guild, vaga, userId) {
  const atual = obter(vaga.id) || vaga;
  const dono = [atual, ...acharTodos(atual)].find((v) => v.ocupanteId && v.ocupanteId !== userId);
  if (dono) return { ok: false, por: dono.ocupanteId, vaga: dono };
  const jaEra = atual.ocupanteId === userId;
  atual.ocupanteId = userId;
  if (!jaEra || !atual.desde) atual.desde = Date.now();
  salvar(atual);
  await mexerCargo(guild, userId, true);
  await atualizarPainel(guild);
  return { ok: true, vaga: atual };
}

async function liberar(guild, vaga) {
  const antigo = vaga.ocupanteId;
  vaga.ocupanteId = null;
  vaga.desde = null;
  salvar(vaga);
  if (antigo) await mexerCargo(guild, antigo, false);
  if (vaga.auto) apagar(vaga.id); // vaga criada por pedido some quando fica livre
  await atualizarPainel(guild);
  return antigo;
}

// Registra o personagem que o membro fechou na recepção (não passa por pedido nem pelo limite).
// Devolve { ok, vaga } ou { pulou: motivo }. Nunca tira um personagem de outra pessoa.
async function registrarDaRecepcao(guild, userId, personagem) {
  const nome = String(personagem || '').trim();
  if (!nome) return { pulou: 'sem nome' };
  // Obra que o membro informou na recepção (só vale se for o mesmo personagem da sessão)
  const sessao = db.get(`recepcao.sessoes.${userId}`);
  const obra = sessao && sessao.obra && nomeBase(sessao.personagem) === nomeBase(nome) ? String(sessao.obra).trim().slice(0, 40) : '';
  // Nome já ocupado bloqueia mesmo que a obra digitada seja outra (erro de digitação não pode burlar a vaga)
  const mesmoNome = todas().filter((v) => nomeBase(v.nome) === nomeBase(nome));
  if (mesmoNome.some((v) => v.ocupanteId === userId)) return { pulou: 'ja-registrado' };
  const ocupada = mesmoNome.find((v) => v.ocupanteId);
  if (ocupada) return { pulou: 'ocupado', vaga: ocupada };
  let vaga = acharTodos({ ext: chaveManual(nome, obra), nome, grupo: obra })[0];
  if (!vaga) {
    vaga = { id: proximoId(), nome, grupo: obra, ext: chaveManual(nome, obra), auto: true, ocupanteId: null, desde: null };
    salvar(vaga);
  } else if (obra && !vaga.grupo) {
    vaga.grupo = obra;
    salvar(vaga);
  }
  const r = await ocupar(guild, vaga, userId);
  return r.ok ? { ok: true, vaga } : { pulou: 'ocupado', vaga: r.vaga };
}

// ===== pedidos =====
// Pedidos de vaga: botões, cartão do pedido e busca de pedido repetido.

function botoesPedido(id, desligados) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`vaga:aprovar:${id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!!desligados),
    new ButtonBuilder().setCustomId(`vaga:recusar:${id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(!!desligados),
  );
}

// Nome, obra e foto do que está sendo pedido (vaga já cadastrada ou personagem novo)
function infoPedido(p, vaga) {
  if (vaga) return { nome: vaga.nome, grupo: vaga.grupo || '', foto: vaga.foto || null };
  if (p.novo) return { nome: p.novo.nome, grupo: p.novo.grupo || '', foto: p.novo.foto || null };
  return { nome: '(removida)', grupo: '', foto: null };
}

// Procura outro pedido em aberto pelo mesmo personagem (não só pela mesma chave)
function pedidoPendente(alvo, chave) {
  return pedidos().find((p) => {
    if (chave && p.chave === chave) return true;
    const base = p.vagaId ? obter(p.vagaId) : p.novo;
    return !!base && mesmoPersonagem({ ext: p.chave, nome: base.nome, grupo: base.grupo }, alvo);
  }) || null;
}

function embedPedido(p, vaga, estado) {
  const i = infoPedido(p, vaga);
  const origem = p.novo ? (p.novo.ext ? ' · achado no AniList' : ' · digitado à mão, confira se existe') : '';
  const emb = new EmbedBuilder()
    .setColor(estado === 'aprovado' ? 0x57f287 : estado === 'recusado' ? 0xed4245 : COR)
    .setTitle('📨 Pedido de vaga')
    .setDescription(`**Membro:** <@${p.userId}>\n**Personagem:** ${i.nome}${i.grupo ? `\n**Obra:** ${i.grupo}` : ''}${p.obs ? `\n**Observação:** ${p.obs}` : ''}`)
    .setFooter({ text: `Pedido #${p.id}${origem}` });
  if (i.foto) emb.setThumbnail(i.foto);
  if (estado) emb.addFields({ name: 'Resultado', value: `${estado === 'aprovado' ? '✅ Aprovado' : '❌ Recusado'} por <@${p.porId}>` });
  return emb;
}

// ===== auditoria =====
// Auditoria: acha personagens cadastrados em duplicidade (a origem do bug) e arruma o que for seguro.

// Agrupa as entradas que são o mesmo personagem
function grupos(lista) {
  const visto = new Set();
  const saida = [];
  for (const v of lista) {
    if (visto.has(v.id)) continue;
    const comp = [];
    const fila = [v];
    visto.add(v.id);
    while (fila.length) {
      const atual = fila.pop();
      comp.push(atual);
      for (const o of lista) {
        if (!visto.has(o.id) && mesmoPersonagem(atual, o)) { visto.add(o.id); fila.push(o); }
      }
    }
    if (comp.length > 1) saida.push(comp.sort((a, b) => Number(a.id) - Number(b.id)));
  }
  return saida;
}

const pontos = (v) => (v.ext && v.ext.startsWith('al:') ? 4 : 0) + (v.foto ? 2 : 0) + (v.grupo ? 1 : 0);

// corrigir=false só relata. corrigir=true:
//  - junta as entradas livres repetidas;
//  - apaga a livre que é gêmea de uma ocupada (passando obra/foto/AniList para a ocupada);
//  - NUNCA mexe quando duas pessoas diferentes ocupam o mesmo personagem (vira "conflito" para a staff decidir).
function auditar({ corrigir = false } = {}) {
  const rel = { grupos: 0, removidas: [], conflitos: [] };
  for (const comp of grupos(todas())) {
    rel.grupos++;
    const ocupadas = comp.filter((v) => v.ocupanteId).sort((a, b) => (a.desde || 0) - (b.desde || 0));
    const fica = ocupadas[0] || comp.slice().sort((a, b) => pontos(b) - pontos(a) || Number(a.id) - Number(b.id))[0];
    const remover = [];
    const conflito = [];
    for (const v of comp) {
      if (v === fica) continue;
      if (v.ocupanteId && v.ocupanteId !== fica.ocupanteId) conflito.push(v);
      else remover.push(v);
    }
    if (conflito.length) rel.conflitos.push([fica, ...conflito]);
    if (!remover.length) continue;

    for (const v of remover) rel.removidas.push({ removida: v, manter: fica });
    if (!corrigir) continue;

    const doador = remover.slice().sort((a, b) => pontos(b) - pontos(a))[0];
    if (!fica.grupo && doador.grupo) fica.grupo = doador.grupo;
    if (!fica.foto && doador.foto) fica.foto = doador.foto;
    if ((!fica.ext || !fica.ext.startsWith('al:')) && doador.ext && doador.ext.startsWith('al:')) fica.ext = doador.ext;
    db.set(`vagas.lista.${fica.id}`, fica);
    for (const v of remover) {
      for (const p of pedidos()) if (p.vagaId === v.id) db.set(`vagas.pedidos.${p.id}`, { ...p, vagaId: fica.id });
      apagar(v.id);
    }
  }
  return rel;
}

module.exports = {
  PADROES, cfg, mensagem, limite, norm,
  todas, obter, salvar, apagar, doUsuario, livres, proximoId,
  pedidos, pedido, proximoPedido, acharVaga,
  chaveManual, nomeBase, acharPorChave, acharTodos, mesmoPersonagem, estaLivre, buscar, resumo, semObra, organizarAuto, definirObras,
  infoPedido, pedidoPendente, registrarDaRecepcao,
  ocupar, liberar, embedPainel, embedsPainel, atualizarPainel, botoesPedido, embedPedido, auditar,
};
