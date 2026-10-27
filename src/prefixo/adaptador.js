// Faz todo comando "/" funcionar também com prefixo (ex.: ++noturno ativar sim).
// A mensagem vira uma "interação de mentirinha" e roda o mesmo código do comando.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../db');

const T = { SUB: 1, GRUPO: 2, STRING: 3, INT: 4, BOOL: 5, USER: 6, CHANNEL: 7, ROLE: 8, MENTIONABLE: 9, NUMBER: 10, ATTACH: 11 };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// O !cargo add/remover já tem o seu próprio comando de texto; só o "prefixo" passa por aqui
const IGNORAR_SUB = { cargo: (t) => norm(t) !== 'prefixo' };
const modais = new Map(); // formulários esperando o botão "Abrir"
const MODAL_MS = 10 * 60 * 1000;
let contModal = 0;
const SIM = ['sim', 's', 'true', '1', 'ligar', 'ligado', 'ativar', 'ativado', 'on', 'yes'];
const NAO = ['nao', 'n', 'false', '0', 'desligar', 'desligado', 'desativar', 'desativado', 'off', 'no'];
const EFEMERA_APAGA_MS = 60 * 1000;


function tokenizar(texto) {
  const re = /([A-Za-z_]+):"([^"]*)"|"([^"]*)"|“([^”]*)”|(\S+)/g;
  const lista = [];
  let m;
  while ((m = re.exec(texto))) {
    lista.push({
      ini: m.index,
      fim: m.index + m[0].length,
      cru: m[0],
      nomeQ: m[1] || null,
      valor: m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5],
      citado: m[3] !== undefined || m[4] !== undefined || m[2] !== undefined,
    });
  }
  return lista;
}

const acha = (lista, nome) => (lista || []).find((o) => norm(o.name) === norm(nome));

// Descobre comando, grupo e subcomando. Devolve { json, grupo, sub, defs, resto, extra }
function localizar(client, tokens) {
  const cmd = client.commands.get(norm(tokens[0].valor));
  if (!cmd) return null;
  const filtro = IGNORAR_SUB[cmd.data.name];
  if (filtro && filtro(tokens[1] ? tokens[1].valor : '')) return null;
  const json = cmd.data.toJSON();
  let resto = tokens.slice(1);
  const opcoes = json.options || [];
  const subs = opcoes.filter((o) => o.type === T.SUB || o.type === T.GRUPO);
  let grupo = null;
  let sub = null;
  let extra = null;

  if (subs.length) {
    const t = resto[0];
    if (t) {
      let achado = acha(subs, t.valor);
      // "ligar"/"desligar" viram "ativar sim/não"
      if (!achado && SIM.includes(norm(t.valor)) !== NAO.includes(norm(t.valor))) {
        const ativar = acha(subs, 'ativar');
        if (ativar) {
          achado = ativar;
          extra = SIM.includes(norm(t.valor)) ? 'sim' : 'nao';
        }
      }
      if (achado) {
        resto = resto.slice(1);
        if (achado.type === T.GRUPO) {
          grupo = achado;
          const t2 = resto[0];
          const s2 = t2 ? acha(achado.options, t2.valor) : null;
          if (s2) { sub = s2; resto = resto.slice(1); }
        } else {
          sub = achado;
        }
      }
    }
    if (extra && sub) {
      // injeta o "sim"/"não" como primeiro argumento
      resto = [{ ini: 0, fim: 0, cru: extra, nomeQ: null, valor: extra, citado: false, sintetico: true }, ...resto];
    }
  }
  const defs = (sub ? sub.options : grupo ? [] : subs.length ? [] : opcoes) || [];
  return { cmd, json, grupo, sub, subs, defs, resto };
}

function uso(prefixo, loc) {
  const { json, grupo, sub, subs } = loc;
  if (subs.length && !sub) {
    const nomes = grupo ? grupo.options.map((s) => s.name) : subs.map((s) => s.name);
    return `Use: \`${prefixo}${json.name}${grupo ? ` ${grupo.name}` : ''} <${nomes.join('|')}>\``;
  }
  const partes = (loc.defs || []).map((o) => {
    let n = o.name;
    if (o.choices && o.choices.length) n += `: ${o.choices.map((c) => c.name).join('/')}`;
    else if (o.type === T.BOOL) n += ': sim/não';
    return o.required ? `<${n}>` : `[${n}]`;
  });
  return `Use: \`${prefixo}${json.name}${grupo ? ` ${grupo.name}` : ''}${sub ? ` ${sub.name}` : ''} ${partes.join(' ')}\``.replace(/ `$/, '`');
}

const num = (s) => Number(String(s).replace(',', '.'));

// Transforma o texto de cada argumento no valor certo. Devolve { valores:Map, erro }
async function converter(message, loc, tokens, client) {
  const defs = loc.defs;
  const valores = new Map();
  const usados = new Set();
  const nomeados = new Map();

  // argumentos nomeados: nome:valor
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let nome = null;
    let valor = null;
    if (t.nomeQ) { nome = t.nomeQ; valor = t.valor; }
    else {
      const m = !t.citado && /^([A-Za-z_]+):([\s\S]+)$/.exec(t.cru);
      if (m && acha(defs, m[1])) { nome = m[1]; valor = m[2]; }
    }
    const def = nome ? acha(defs, nome) : null;
    if (def && !nomeados.has(def.name)) {
      nomeados.set(def.name, valor);
      usados.add(i);
    }
  }
  const posicionais = tokens.map((t, i) => ({ t, i })).filter((x) => !usados.has(x.i)).map((x) => x.t);
  let anexo = 0;
  const anexos = [...(message.attachments ? message.attachments.values() : [])];

  for (let k = 0; k < defs.length; k++) {
    const d = defs[k];
    let bruto;
    if (d.type === T.ATTACH) {
      const a = anexos[anexo++];
      if (a) valores.set(d.name, a);
      else if (d.required) return { erro: `Anexe um arquivo para **${d.name}**.` };
      continue;
    }
    if (nomeados.has(d.name)) {
      bruto = nomeados.get(d.name);
    } else if (posicionais.length) {
      // Texto livre pode ocupar várias palavras, deixando para trás só o que os próximos argumentos precisam
      const reserva = d.type === T.STRING ? reservar(defs.slice(k + 1).filter((x) => !nomeados.has(x.name) && x.type !== T.ATTACH), posicionais) : 0;
      const levar = Math.max(1, posicionais.length - reserva);
      if (d.type === T.STRING && levar > 1) {
        const pegos = posicionais.splice(0, levar);
        bruto = message.content.slice(pegos[0].ini + (message._off || 0), pegos[pegos.length - 1].fim + (message._off || 0));
      } else {
        bruto = posicionais.shift().valor;
      }
    } else {
      if (d.required) return { erro: `Falta o argumento **${d.name}**.` };
      continue;
    }

    const r = await valorDe(message, d, bruto, client);
    if (r.erro) return { erro: r.erro };
    valores.set(d.name, r.valor);
  }
  if (posicionais.length) {
    // sobras só são aceitas quando o último argumento é texto livre; senão avisamos
    return { erro: 'Argumentos demais para esse comando.' };
  }
  return { valores };
}

// O token combina com o tipo do argumento?
function parece(d, tok) {
  const v = String(tok.valor).trim();
  switch (d.type) {
    case T.INT: case T.NUMBER: return Number.isFinite(num(v));
    case T.BOOL: return SIM.includes(norm(v)) || NAO.includes(norm(v));
    case T.USER: case T.MENTIONABLE: return /^<@!?\d+>$|^\d{15,25}$/.test(v);
    case T.CHANNEL: return /^<#\d+>$|^#|^\d{15,25}$/.test(v);
    case T.ROLE: return /^<@&\d+>$|^@|^\d{15,25}$/.test(v);
    case T.STRING: return true;
    default: return false;
  }
}

// Quantas palavras do fim precisam ficar guardadas para os argumentos que vêm depois
function reservar(resto, posicionais) {
  let reserva = 0;
  for (let i = resto.length - 1; i >= 0; i--) {
    const tok = posicionais[posicionais.length - 1 - reserva];
    if (!tok || posicionais.length - 1 - reserva < 1) break;
    if (parece(resto[i], tok) || resto[i].required) reserva++;
    else if (resto[i].type === T.STRING) reserva++;
    // argumento opcional que não combina: fica de fora e tentamos o anterior
  }
  return reserva;
}

async function valorDe(message, d, bruto, client) {
  const guild = message.guild;
  const s = String(bruto).trim();
  switch (d.type) {
    case T.STRING: {
      if (d.choices && d.choices.length) {
        const c = d.choices.find((x) => norm(x.name) === norm(s) || norm(String(x.value)) === norm(s))
          || d.choices.find((x) => norm(x.name).startsWith(norm(s)));
        if (!c) return { erro: `Em **${d.name}** use: ${d.choices.map((x) => x.name).join(', ')}.` };
        return { valor: c.value };
      }
      if (d.max_length && s.length > d.max_length) return { erro: `**${d.name}** pode ter no máximo ${d.max_length} caracteres.` };
      if (d.min_length && s.length < d.min_length) return { erro: `**${d.name}** precisa de pelo menos ${d.min_length} caracteres.` };
      return { valor: s, autocompletar: !!d.autocomplete };
    }
    case T.INT:
    case T.NUMBER: {
      const n = num(s);
      if (!Number.isFinite(n) || (d.type === T.INT && !Number.isInteger(n))) return { erro: `**${d.name}** precisa ser um número${d.type === T.INT ? ' inteiro' : ''}.` };
      if (d.min_value !== undefined && n < d.min_value) return { erro: `**${d.name}** precisa ser no mínimo ${d.min_value}.` };
      if (d.max_value !== undefined && n > d.max_value) return { erro: `**${d.name}** precisa ser no máximo ${d.max_value}.` };
      if (d.choices && d.choices.length) {
        const c = d.choices.find((x) => norm(x.name) === norm(s) || Number(x.value) === n);
        if (!c) return { erro: `Em **${d.name}** use: ${d.choices.map((x) => x.name).join(', ')}.` };
        return { valor: c.value };
      }
      return { valor: n };
    }
    case T.BOOL: {
      const v = norm(s);
      if (SIM.includes(v)) return { valor: true };
      if (NAO.includes(v)) return { valor: false };
      return { erro: `**${d.name}**: responda sim ou não.` };
    }
    case T.USER:
    case T.MENTIONABLE: {
      const id = (/^<@!?(\d+)>$/.exec(s) || /^(\d{15,25})$/.exec(s) || [])[1];
      if (!id) {
        if (d.type === T.MENTIONABLE) return roleDe(guild, s, d);
        return { erro: `**${d.name}**: marque o membro (@fulano) ou use o ID.` };
      }
      const user = await client.users.fetch(id).catch(() => null);
      if (!user) return { erro: `Não achei esse usuário em **${d.name}**.` };
      const member = await guild.members.fetch(id).catch(() => null);
      return { valor: { user, member } };
    }
    case T.CHANNEL: {
      const id = (/^<#(\d+)>$/.exec(s) || /^(\d{15,25})$/.exec(s) || [])[1];
      let ch = id ? await guild.channels.fetch(id).catch(() => null) : null;
      if (!ch) {
        const n = norm(s.replace(/^#/, ''));
        ch = guild.channels.cache.find((c) => norm(c.name) === n && (!d.channel_types || d.channel_types.includes(c.type)));
      }
      if (!ch) return { erro: `**${d.name}**: não achei esse canal. Marque com # ou use o ID.` };
      if (d.channel_types && !d.channel_types.includes(ch.type)) return { erro: `**${d.name}**: esse tipo de canal não serve aqui.` };
      return { valor: ch };
    }
    case T.ROLE:
      return roleDe(guild, s, d);
    default:
      return { erro: `Não sei usar o argumento **${d.name}** por texto. Use /comando.` };
  }
}

function roleDe(guild, s, d) {
  const id = (/^<@&(\d+)>$/.exec(s) || /^(\d{15,25})$/.exec(s) || [])[1];
  let r = id ? guild.roles.cache.get(id) : null;
  if (!r) {
    const n = norm(s.replace(/^@/, ''));
    r = guild.roles.cache.find((x) => norm(x.name) === n);
  }
  return r ? { valor: r } : { erro: `**${d.name}**: não achei esse cargo. Marque com @ ou escreva o nome certinho.` };
}

// Descobre o valor real de campos com autocompletar (ex.: nome de item)
function resolverAuto(client, message, loc, nome, texto, valores) {
  return new Promise((resolve) => {
    let fim = false;
    const fechar = (v) => { if (!fim) { fim = true; resolve(v); } };
    const base = {
      client, commandName: loc.json.name, guild: message.guild, guildId: message.guild.id, channel: message.channel,
      channelId: message.channel.id, user: message.author, member: message.member,
      memberPermissions: message.member.permissions, customId: '', locale: 'pt-BR',
      isAutocomplete: () => true,
      respond: async (lista) => fechar(lista),
      options: opcoesDe(loc, valores, { focado: { name: nome, value: texto } }),
    };
    const fake = new Proxy(base, { get: (t, p) => (p in t ? t[p] : typeof p === 'string' && p.startsWith('is') ? () => false : undefined) });
    try { client.emit('interactionCreate', fake); } catch { fechar(null); }
    setTimeout(() => fechar(null), 1500);
  });
}

function opcoesDe(loc, valores, { focado } = {}) {
  const pega = (n) => (valores.has(n) ? valores.get(n) : null);
  return {
    getSubcommand(req = true) {
      if (!loc.sub) { if (req) throw new Error('Sem subcomando'); return null; }
      return loc.sub.name;
    },
    getSubcommandGroup(req = true) {
      if (!loc.grupo) { if (req) throw new Error('Sem grupo'); return null; }
      return loc.grupo.name;
    },
    getString: (n) => (focado && focado.name === n ? focado.value : pega(n)),
    getInteger: pega,
    getNumber: pega,
    getBoolean: pega,
    getUser: (n) => { const v = pega(n); return v ? v.user : null; },
    getMember: (n) => { const v = pega(n); return v ? v.member : null; },
    getChannel: pega,
    getRole: pega,
    getMentionable: (n) => { const v = pega(n); return v && v.user ? (v.member || v.user) : v; },
    getAttachment: pega,
    getFocused: (completo) => (completo ? { name: focado ? focado.name : '', value: focado ? focado.value : '', focused: true } : (focado ? focado.value : '')),
    get: pega,
    data: [],
  };
}

function criarInteracao(message, client, loc, valores) {
  let resposta = null;
  const limpar = (p) => {
    const o = typeof p === 'string' ? { content: p } : { ...(p || {}) };
    let efemera = !!o.ephemeral;
    delete o.ephemeral;
    delete o.fetchReply;
    delete o.withResponse;
    if (o.flags !== undefined && typeof o.flags === 'number') {
      if (o.flags & 64) efemera = true;
      const nf = o.flags & ~64;
      if (nf) o.flags = nf; else delete o.flags;
    } else if (o.flags !== undefined) {
      delete o.flags;
    }
    return { o, efemera };
  };
  const agendarApagar = (msg, efemera) => {
    if (efemera && msg) setTimeout(() => msg.delete().catch(() => {}), EFEMERA_APAGA_MS);
  };

  const base = {
    client,
    commandName: loc.json.name,
    commandId: loc.json.name,
    id: message.id,
    guild: message.guild,
    guildId: message.guild.id,
    channel: message.channel,
    channelId: message.channel.id,
    user: message.author,
    member: message.member,
    memberPermissions: message.member.permissions,
    createdTimestamp: message.createdTimestamp,
    locale: 'pt-BR',
    customId: '',
    replied: false,
    deferred: false,
    porTexto: true,
    options: opcoesDe(loc, valores),
    inGuild: () => true,
    isChatInputCommand: () => true,
    isCommand: () => true,
    isRepliable: () => true,
    async deferReply() {
      this.deferred = true;
      await message.channel.sendTyping().catch(() => {});
    },
    async reply(p) {
      this.replied = true;
      const { o, efemera } = limpar(p);
      resposta = await message.reply({ ...o, failIfNotExists: false });
      agendarApagar(resposta, efemera);
      return resposta;
    },
    async editReply(p) {
      const { o, efemera } = limpar(p);
      delete o.flags;
      if (resposta) {
        resposta = await resposta.edit(o);
      } else {
        resposta = await message.reply({ ...o, failIfNotExists: false });
        agendarApagar(resposta, efemera);
      }
      this.replied = true;
      return resposta;
    },
    async followUp(p) {
      const { o, efemera } = limpar(p);
      const m = await message.channel.send(o);
      agendarApagar(m, efemera);
      return m;
    },
    async fetchReply() { return resposta; },
    async deleteReply() { if (resposta) await resposta.delete().catch(() => {}); },
    // Formulário não abre por mensagem: mandamos um botão que abre o formulário de verdade
    async showModal(modal) {
      const id = `${Date.now().toString(36)}${(contModal++).toString(36)}`;
      modais.set(id, { modal, userId: message.author.id });
      const linha = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`pfx:modal:${id}`).setLabel('Abrir formulário').setEmoji('📝').setStyle(ButtonStyle.Primary),
      );
      this.replied = true;
      resposta = await message.reply({ content: '📝 Esse comando usa um formulário. Aperte o botão para abrir:', components: [linha], failIfNotExists: false });
      setTimeout(() => {
        modais.delete(id);
        resposta.edit({ content: '⌛ O formulário expirou. Use o comando de novo.', components: [] }).catch(() => {});
      }, MODAL_MS);
    },
    async awaitModalSubmit() { throw new Error('Formulário não existe no modo texto'); },
  };
  return new Proxy(base, {
    get: (t, p) => (p in t ? t[p] : typeof p === 'string' && /^is[A-Z]/.test(p) ? () => false : undefined),
  });
}

async function executar(client, message) {
  if (!message.guild || message.author.bot || !message.member) return;
  const prefixo = db.get('config.prefixo', '!');
  if (!message.content.startsWith(prefixo)) return;

  const corpo = message.content.slice(prefixo.length);
  const deslocamento = prefixo.length;
  if (!corpo.trim() || /^\s/.test(corpo)) return;

  const tokens = tokenizar(corpo);
  if (!tokens.length) return;
  const loc = localizar(client, tokens);
  if (!loc) return; // não é um comando nosso: ignora em silêncio

  const responder = (t) => message.reply({ content: t, allowedMentions: { parse: [], repliedUser: false }, failIfNotExists: false }).catch(() => {});

  // Mesma regra de permissão que o Discord aplicaria ao comando "/"
  const perm = loc.json.default_member_permissions;
  if (perm != null && !message.member.permissions.has(BigInt(perm))) {
    return responder('❌ Você não tem permissão para usar esse comando.');
  }

  if (loc.subs.length && !loc.sub) return responder(uso(prefixo, loc));

  // os índices dos tokens são relativos ao corpo; guardamos o deslocamento
  message._off = deslocamento;
  const conv = await converter(message, loc, loc.resto, client);
  if (conv.erro) return responder(`❌ ${conv.erro}\n${uso(prefixo, loc)}`);

  // campos com autocompletar: tenta achar o valor real (ex.: nome do item → id)
  for (const d of loc.defs) {
    if (!d.autocomplete || !conv.valores.has(d.name)) continue;
    const texto = conv.valores.get(d.name);
    const lista = await resolverAuto(client, message, loc, d.name, texto, conv.valores);
    if (Array.isArray(lista) && lista.length) {
      const n = norm(texto);
      const ach = lista.find((x) => String(x.value) === texto)
        || lista.find((x) => norm(x.name) === n)
        || lista.find((x) => norm(x.name).includes(n));
      if (ach) conv.valores.set(d.name, ach.value);
    }
  }

  const interacao = criarInteracao(message, client, loc, conv.valores);
  try {
    await message.channel.sendTyping().catch(() => {});
    await loc.cmd.execute(interacao, client);
  } catch (erro) {
    console.error(`[Prefixo] erro em ${loc.json.name}:`, erro);
    await responder('Ops, deu erro ao executar esse comando.');
  }
}

// Botão "Abrir formulário"
async function abrirModal(interaction) {
  const id = interaction.customId.split(':')[2];
  const item = modais.get(id);
  if (!item) return interaction.reply({ content: 'Esse formulário expirou. Use o comando de novo.', flags: MessageFlags.Ephemeral });
  if (item.userId !== interaction.user.id) return interaction.reply({ content: 'Esse formulário não é seu 💜', flags: MessageFlags.Ephemeral });
  modais.delete(id);
  await interaction.showModal(item.modal);
}

module.exports = { abrirModal, executar, tokenizar, localizar, converter, uso, norm };
