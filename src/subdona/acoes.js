// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · as mãos
//  Cada ação confere permissões e hierarquia ANTES de agir e devolve
//  { ok, texto, desfazer } — "desfazer" é o que o botão Desfazer executa.
//  Regras fixas (nem o pai muda): nunca age contra o dono do servidor, contra o
//  pai nem contra ela mesma, e nunca passa por cima da hierarquia de cargos.
// ─────────────────────────────────────────────────────────────
const { PermissionFlagsBits: PF } = require('discord.js');
const Mod = require('../moderacao/nucleo');
const N = require('./nucleo');

const PODER_DE = {
  advertir: 'advertir', silenciar: 'silenciar', tirar_silencio: 'silenciar', expulsar: 'expulsar', banir: 'banir', desbanir: 'desbanir',
  limpar: 'limpar', trancar: 'trancar', destrancar: 'trancar', lento: 'lento', anunciar: 'anunciar', cargo_dar: 'cargo', cargo_tirar: 'cargo', apelido: 'apelido',
};
const ROTULO = {
  advertir: 'Advertir', silenciar: 'Silenciar', tirar_silencio: 'Tirar o castigo', expulsar: 'Expulsar', banir: 'Banir', desbanir: 'Desbanir',
  limpar: 'Limpar mensagens', trancar: 'Trancar o canal', destrancar: 'Destrancar o canal', lento: 'Modo lento', anunciar: 'Anunciar',
  cargo_dar: 'Dar cargo', cargo_tirar: 'Tirar cargo', apelido: 'Mudar apelido', apagar_msg: 'Apagar o anúncio',
};
const REVERSIVEL = new Set(['silenciar', 'tirar_silencio', 'banir', 'trancar', 'destrancar', 'lento', 'anunciar', 'cargo_dar', 'cargo_tirar', 'apelido']);

const falha = (texto) => ({ ok: false, texto });
const bom = (texto, desfazer = null) => ({ ok: true, texto, desfazer });
const fala = (s) => `${s}`.length > 28 ? `${String(s).slice(0, 27)}…` : String(s);

function formatarTempo(ms) {
  const s = Math.round(ms / 1000);
  if (s % 86400 === 0 && s >= 86400) return `${s / 86400} dia(s)`;
  if (s % 3600 === 0 && s >= 3600) return `${s / 3600} h`;
  if (s % 60 === 0 && s >= 60) return `${s / 60} min`;
  return `${s} s`;
}

// ── Conferências ─────────────────────────────────────────────
async function conferirPermissao(ctx, acao) {
  const poder = N.PODERES[PODER_DE[acao]];
  if (!poder) return null;
  const flag = PF[poder.perm];
  if (!ctx.ehPai && !(ctx.executor.permissions && ctx.executor.permissions.has(flag))) return `Você precisa da permissão **${poder.nome}** do Discord para mandar isso.`;
  const eu = ctx.guild.members.me;
  if (eu && !eu.permissions.has(flag)) return `Eu não tenho a permissão do Discord para isso (${poder.perm}). Peça a um admin para me dar.`;
  return null;
}

async function protegerAlvo(ctx, alvo) {
  const g = ctx.guild;
  if (alvo.id === g.ownerId) return 'Não mexo com o dono do servidor.';
  if (alvo.id === ctx.client.user.id) return 'Comigo mesma eu não faço isso.';
  if (alvo.id === (await N.paiId(ctx.client))) return 'Com o pai eu não faço isso, nem por ordem de ninguém.';
  const eu = g.members.me;
  if (eu && alvo.roles.highest.position >= eu.roles.highest.position) return 'O cargo dessa pessoa está acima do meu.';
  if (!ctx.ehPai) {
    const e = Mod.checarHierarquia(ctx.executor, alvo);
    if (e) return e;
    if (alvo.permissions.has(PF.Administrator) || alvo.permissions.has(PF.ManageGuild)) return 'Essa pessoa é da staff. Só o pai manda eu agir contra a staff.';
  }
  return null;
}

async function membroDe(ctx, id) {
  if (!id) return null;
  try { return await ctx.guild.members.fetch(id); } catch { return null; }
}

// ── Ações ────────────────────────────────────────────────────
const FAZ = {
  async silenciar(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    if (!m) return falha('Marque quem eu devo silenciar (a pessoa precisa estar no servidor).');
    const e = await protegerAlvo(ctx, m); if (e) return falha(e);
    if (!m.moderatable) return falha('Não consigo silenciar essa pessoa.');
    await m.timeout(p.ms, `${p.motivo || 'sem motivo'} | Atlas a mando de ${ctx.executorUser.tag}`.slice(0, 500));
    return bom(`**${m.displayName}** está de castigo por ${formatarTempo(p.ms)}.`, { acao: 'tirar_silencio', alvo: m.id });
  },
  async tirar_silencio(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    if (!m) return falha('Marque quem eu devo liberar.');
    await m.timeout(null, `Atlas a mando de ${ctx.executorUser.tag}`);
    return bom(`**${m.displayName}** foi liberado do castigo.`);
  },
  async advertir(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    if (!m) return falha('Marque quem eu devo advertir.');
    const e = await protegerAlvo(ctx, m); if (e) return falha(e);
    const r = await Mod.darAviso(ctx.guild, ctx.executorUser, m, p.motivo || 'Sem motivo informado');
    return bom(`**${m.displayName}** recebeu o aviso ${r.total}/${r.limite}.${r.banido && r.banido.ok ? ' Chegou ao limite e foi banido.' : ''}`);
  },
  async expulsar(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    if (!m) return falha('Marque quem eu devo expulsar.');
    const e = await protegerAlvo(ctx, m); if (e) return falha(e);
    if (!m.kickable) return falha('Não consigo expulsar essa pessoa.');
    const r = await Mod.expulsar(ctx.guild, ctx.executorUser, m, p.motivo || 'Sem motivo informado');
    return r.ok ? bom(`**${m.displayName}** foi expulso.`) : falha(`Não consegui expulsar: ${r.erro}`);
  },
  async banir(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    let user = m && m.user;
    if (!user) { try { user = await ctx.client.users.fetch(p.alvo); } catch { return falha('Não achei essa pessoa. Marque ou use o ID.'); } }
    if (m) { const e = await protegerAlvo(ctx, m); if (e) return falha(e); if (!m.bannable) return falha('Não consigo banir essa pessoa.'); }
    const r = await Mod.banir(ctx.guild, ctx.executorUser, user, m, p.motivo || 'Sem motivo informado', 0);
    return r.ok ? bom(`**${user.username}** foi banido.`, { acao: 'desbanir', alvo: user.id }) : falha(`Não consegui banir: ${r.erro}`);
  },
  async desbanir(ctx, p) {
    if (!p.alvo) return falha('Use o ID de quem eu devo desbanir.');
    const r = await Mod.desbanir(ctx.guild, ctx.executorUser, p.alvo, p.motivo || 'Sem motivo informado');
    return r.ok ? bom(`**${r.user.username}** foi desbanido.`) : falha(`Não consegui desbanir: ${r.erro}`);
  },
  async limpar(ctx, p) {
    const canal = p.canalAlvo || ctx.canal;
    const lote = await canal.messages.fetch({ limit: 100 });
    const limite = Date.now() - 13.5 * 86400 * 1000;
    let lista = [...lote.values()].filter((x) => x.id !== ctx.msgId && !x.pinned && x.createdTimestamp > limite);
    if (p.alvo) lista = lista.filter((x) => x.author.id === p.alvo);
    lista = lista.slice(0, p.n);
    if (ctx.msgId) { const cmd = lote.get(ctx.msgId); if (cmd) lista.push(cmd); }
    if (!lista.length) return falha('Não achei mensagens para apagar (só consigo apagar as de menos de 14 dias).');
    const apagadas = await canal.bulkDelete(lista, true);
    return bom(`Apaguei **${Math.max(0, apagadas.size - (ctx.msgId ? 1 : 0))}** mensagem(ns).`);
  },
  async trancar(ctx, p) {
    const canal = p.canalAlvo || ctx.canal;
    const todos = ctx.guild.roles.everyone;
    const atual = canal.permissionOverwrites.cache.get(todos.id);
    const era = atual ? (atual.allow.has(PF.SendMessages) ? true : atual.deny.has(PF.SendMessages) ? false : null) : null;
    if (era === false) return falha('Esse canal já está trancado.');
    await canal.permissionOverwrites.edit(todos, { SendMessages: false }, { reason: `${p.motivo || 'Sem motivo'} | Atlas a mando de ${ctx.executorUser.tag}`.slice(0, 500) });
    return bom(`Tranquei ${canal}.`, { acao: 'destrancar', canalId: canal.id, era });
  },
  async destrancar(ctx, p) {
    const canal = p.canalAlvo || ctx.canal;
    const era = p.era === undefined ? null : p.era;
    await canal.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: era }, { reason: `Atlas a mando de ${ctx.executorUser.tag}` });
    return bom(`Destranquei ${canal}.`, p.era === undefined ? { acao: 'trancar', canalId: canal.id } : null);
  },
  async lento(ctx, p) {
    const canal = p.canalAlvo || ctx.canal;
    const antes = canal.rateLimitPerUser || 0;
    await canal.setRateLimitPerUser(p.segundos, `Atlas a mando de ${ctx.executorUser.tag}`);
    return bom(p.segundos ? `Modo lento de **${p.segundos} s** em ${canal}.` : `Modo lento desligado em ${canal}.`, { acao: 'lento', canalId: canal.id, segundos: antes });
  },
  async anunciar(ctx, p) {
    const canal = p.canalAlvo || ctx.canal;
    if (!p.texto) return falha('Faltou o texto do anúncio. Exemplo: `atlas, anuncia #avisos: Evento hoje às 20h`.');
    const texto = p.texto.replace(/@(everyone|here)/gi, '@$1');
    const msg = await canal.send({ content: texto, allowedMentions: { parse: [] } });
    return bom(`Anúncio postado em ${canal}.`, { acao: 'apagar_msg', canalId: canal.id, msgId: msg.id });
  },
  async apagar_msg(ctx, p) {
    const canal = ctx.guild.channels.cache.get(p.canalId);
    const m = canal && await canal.messages.fetch(p.msgId).catch(() => null);
    if (!m) return falha('A mensagem já não existe.');
    await m.delete();
    return bom('Anúncio apagado.');
  },
  async cargo_dar(ctx, p) { return trocarCargo(ctx, p, true); },
  async cargo_tirar(ctx, p) { return trocarCargo(ctx, p, false); },
  async apelido(ctx, p) {
    const m = await membroDe(ctx, p.alvo);
    if (!m) return falha('Marque de quem eu devo mudar o apelido.');
    const e = await protegerAlvo(ctx, m); if (e) return falha(e);
    if (!m.manageable) return falha('Não consigo mudar o apelido dessa pessoa.');
    const antes = m.nickname || null;
    await m.setNickname(p.apelido || null, `Atlas a mando de ${ctx.executorUser.tag}`);
    return bom(p.apelido ? `Apelido de **${fala(m.user.username)}** agora é **${p.apelido}**.` : 'Apelido removido.', { acao: 'apelido', alvo: m.id, apelido: antes });
  },
};

async function trocarCargo(ctx, p, dar) {
  const m = await membroDe(ctx, p.alvo);
  const cargo = p.cargo && ctx.guild.roles.cache.get(p.cargo);
  if (!m || !cargo) return falha('Marque a pessoa e o cargo. Exemplo: `atlas, dá o cargo @Membro para @fulano`.');
  const e = await protegerAlvo(ctx, m); if (e) return falha(e);
  const eu = ctx.guild.members.me;
  if (cargo.managed || cargo.id === ctx.guild.id) return falha('Esse cargo não pode ser dado ou tirado por mim.');
  if (eu && cargo.position >= eu.roles.highest.position) return falha('Esse cargo está acima do meu.');
  if (!ctx.ehPai) {
    if (ctx.executor.roles.highest.position <= cargo.position && ctx.executor.id !== ctx.guild.ownerId) return falha('Esse cargo está acima do seu.');
    if (cargo.permissions.has(PF.Administrator)) return falha('Cargo com permissão de administrador só o pai manda eu mexer.');
  }
  if (dar) await m.roles.add(cargo, `Atlas a mando de ${ctx.executorUser.tag}`);
  else await m.roles.remove(cargo, `Atlas a mando de ${ctx.executorUser.tag}`);
  return bom(`${dar ? 'Dei' : 'Tirei'} o cargo **${cargo.name}** ${dar ? 'a' : 'de'} **${m.displayName}**.`, { acao: dar ? 'cargo_tirar' : 'cargo_dar', alvo: m.id, cargo: cargo.id });
}

// ── Entrada principal ────────────────────────────────────────
// ctx: { client, guild, canal, executor (GuildMember), executorUser, ehPai, msgId }
async function executar(acao, params, ctx) {
  const fn = FAZ[acao];
  if (!fn) return falha('Essa ação eu não conheço.');
  if (acao !== 'apagar_msg') {
    const poder = PODER_DE[acao];
    if (N.modo(poder) === 'off') return falha(`O poder **${N.PODERES[poder].nome}** está desligado. O pai liga em \`/subdona poder\`.`);
    const e = await conferirPermissao(ctx, acao);
    if (e) return falha(e);
  }
  try {
    return await fn(ctx, params);
  } catch (erro) {
    console.error(`[Sub dona] ${acao}:`, erro);
    return falha(`Não consegui: ${String(erro.message || erro).slice(0, 150)}`);
  }
}

// Texto curto do que vai acontecer (usado no painel de confirmação e no diário)
function descrever(acao, p, nomes = {}) {
  const quem = p.alvo ? (nomes.alvo || `<@${p.alvo}>`) : '';
  const mot = p.motivo ? ` · motivo: ${p.motivo}` : '';
  switch (acao) {
    case 'silenciar': return `Silenciar ${quem} por ${formatarTempo(p.ms)}${mot}`;
    case 'tirar_silencio': return `Tirar o castigo de ${quem}`;
    case 'advertir': return `Advertir ${quem}${mot}`;
    case 'expulsar': return `Expulsar ${quem}${mot}`;
    case 'banir': return `Banir ${quem}${mot}`;
    case 'desbanir': return `Desbanir ${quem}${mot}`;
    case 'limpar': return `Apagar ${p.n} mensagem(ns)${p.alvo ? ` de ${quem}` : ''}`;
    case 'trancar': return 'Trancar o canal';
    case 'destrancar': return 'Destrancar o canal';
    case 'lento': return p.segundos ? `Modo lento de ${p.segundos} s` : 'Desligar o modo lento';
    case 'anunciar': return `Anunciar: ${String(p.texto || '').slice(0, 120)}`;
    case 'cargo_dar': return `Dar o cargo <@&${p.cargo}> a ${quem}`;
    case 'cargo_tirar': return `Tirar o cargo <@&${p.cargo}> de ${quem}`;
    case 'apelido': return `Mudar o apelido de ${quem} para ${p.apelido || '(nenhum)'}`;
    default: return ROTULO[acao] || acao;
  }
}

module.exports = { executar, descrever, conferirPermissao, PODER_DE, ROTULO, REVERSIVEL, formatarTempo };
