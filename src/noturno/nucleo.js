const { ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../db');

const IGNORAR_TRADUCAO = Symbol.for('atlas.mensagens.ignorar'); // não passa pelo editor de mensagens

const PADROES = {
  fechar: '00:00',
  abrir: '06:00',
  aviso: 10,
  fuso: 'America/Sao_Paulo',
  mensagens: {
    // soTexto: todas vão como mensagem de texto, com banner opcional aparecendo como imagem logo abaixo (config.noturno.mensagens.<tipo>.banner)
    avisoFechar: {
      soTexto: true,
      texto: '🌙 **Hora de dormir!** Faltam **{minutos} minutos** para os chats fecharem (**{fechar}**). Terminem suas cenas! 💤',
    },
    fechou: {
      soTexto: true,
      texto: '🔒 **Chats fechados.** Boa noite, house! Os chats voltam às **{abrir}**. 🌙',
    },
    avisoAbrir: {
      soTexto: true,
      texto: '☀️ **Já já amanhece!** Faltam **{minutos} minutos** para os chats abrirem (**{abrir}**).',
    },
    abriu: {
      soTexto: true,
      texto: '🔓 **Chats abertos.** Bom dia, house! ☀️',
    },
  },
};

// Permissões que o bloqueio tira (e depois devolve como estavam)
const PERMS = ['SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads', 'AddReactions'];
const TIPOS_CANAL = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const TIPOS_VOZ = [ChannelType.GuildVoice, ChannelType.GuildStageVoice];
const COR = 0x5b6ee1;

function cfg(chave, padrao) {
  return db.get(`config.noturno.${chave}`, padrao);
}

function cfgLista(chave) {
  const v = cfg(chave);
  return Array.isArray(v) ? v : [];
}

const horaFechar = () => cfg('fechar', PADROES.fechar);
const horaAbrir = () => cfg('abrir', PADROES.abrir);
const minutosAviso = () => Number(cfg('aviso', PADROES.aviso));
const fuso = () => cfg('fuso', PADROES.fuso);

function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

const ehSoTexto = (tipo) => !!PADROES.mensagens[tipo].soTexto;

// Banner (imagem grande) opcional: link direto de uma imagem
function bannerValido(url) {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return /^https?:\/\/\S+$/i.test(t) && t.length <= 500 ? t : null;
}

const banner = (tipo) => bannerValido(cfg(`mensagens.${tipo}.banner`));

// O banner aparece como imagem grande logo abaixo do texto (embed só com a imagem)
function embedBanner(url) {
  return new EmbedBuilder().setColor(COR).setImage(url);
}

function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// "6", "6h", "06:30", "6h30" -> "06:30". Retorna null se for inválido.
function normalizarHora(txt) {
  const m = String(txt).trim().match(/^(\d{1,2})(?:[:hH](\d{2})?)?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function paraMin(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function deMin(min) {
  const t = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// Data e hora atuais no fuso configurado
function agora() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const pega = (t) => partes.find((p) => p.type === t).value;
  return { data: `${pega('year')}-${pega('month')}-${pega('day')}`, hora: `${pega('hour')}:${pega('minute')}` };
}

// Está na janela em que os chats devem ficar fechados?
function deveFechar(agoraMin, fecharMin, abrirMin) {
  if (fecharMin === abrirMin) return false;
  if (fecharMin < abrirMin) return agoraMin >= fecharMin && agoraMin < abrirMin;
  return agoraMin >= fecharMin || agoraMin < abrirMin;
}

// Todos os chats que o bloqueio atinge (chats soltos + chats dentro das categorias)
function canaisAlvo(guild) {
  const soltos = cfgLista('canais');
  const cats = cfgLista('categorias');
  const resultado = new Map();

  for (const id of soltos) {
    const c = guild.channels.cache.get(id);
    if (c && TIPOS_CANAL.includes(c.type)) resultado.set(c.id, c);
  }
  for (const c of guild.channels.cache.values()) {
    if (c.parentId && cats.includes(c.parentId) && TIPOS_CANAL.includes(c.type)) resultado.set(c.id, c);
  }
  return [...resultado.values()];
}

// Calls (voz/palco) atingidas pelo fechamento: soltas na lista ou dentro das categorias
function ehCanalVoz(canal) {
  if (!canal || !TIPOS_VOZ.includes(canal.type)) return false;
  return cfgLista('canais').includes(canal.id) || (!!canal.parentId && cfgLista('categorias').includes(canal.parentId));
}

function canaisVoz(guild) {
  return [...guild.channels.cache.values()].filter(ehCanalVoz);
}

// Desconecta quem está nas calls bloqueadas (bots ficam)
async function expulsarDaVoz(guild, motivo = 'Fechamento noturno') {
  let expulsos = 0;
  let falhas = 0;
  for (const canal of canaisVoz(guild)) {
    for (const membro of [...canal.members.values()]) {
      if (membro.user.bot) continue;
      try {
        await membro.voice.disconnect(motivo);
        expulsos++;
      } catch (erro) {
        falhas++;
        console.error(`[Noturno] falha ao tirar ${membro.user.tag} da call ${canal.name}:`, erro.message);
      }
    }
  }
  return { expulsos, falhas };
}

// Bloqueia o envio de mensagens, guardando como estava antes
async function fechar(guild, motivo = 'Fechamento noturno') {
  const alvos = canaisAlvo(guild);
  const cargos = [guild.id, ...cfgLista('cargos')];
  let ok = 0;
  let falhas = 0;

  for (const canal of alvos) {
    for (const cargoId of cargos) {
      if (cargoId !== guild.id && !guild.roles.cache.has(cargoId)) continue;

      const chave = `noturno.estado.${canal.id}.${cargoId}`;
      if (db.get(chave)) continue; // já está fechado por nós

      const ow = canal.permissionOverwrites.cache.get(cargoId);
      const original = {};
      for (const p of PERMS) {
        original[p] = ow ? (ow.allow.has(p) ? true : ow.deny.has(p) ? false : null) : null;
      }
      db.set(chave, { existia: !!ow, original });

      const novo = {};
      for (const p of PERMS) novo[p] = false;
      try {
        await canal.permissionOverwrites.edit(cargoId, novo, { reason: motivo });
        ok++;
      } catch (erro) {
        falhas++;
        db.remover(chave);
        console.error(`[Noturno] falha ao fechar #${canal.name}:`, erro.message);
      }
    }
  }

  db.set('noturno.trancado', true);
  const voz = await expulsarDaVoz(guild, motivo);
  return { ok, falhas, canais: alvos.length, voz: canaisVoz(guild).length, expulsos: voz.expulsos, falhasVoz: voz.falhas };
}

// Devolve as permissões como estavam antes do bloqueio
async function abrir(guild, motivo = 'Abertura da manhã') {
  const estado = db.get('noturno.estado', {}) || {};
  let ok = 0;
  let falhas = 0;

  for (const [canalId, cargos] of Object.entries(estado)) {
    const canal = guild.channels.cache.get(canalId);
    if (!canal) continue;
    for (const [cargoId, info] of Object.entries(cargos)) {
      try {
        if (info.existia) {
          await canal.permissionOverwrites.edit(cargoId, info.original, { reason: motivo });
        } else {
          await canal.permissionOverwrites.delete(cargoId, motivo);
        }
        ok++;
      } catch (erro) {
        falhas++;
        console.error(`[Noturno] falha ao abrir #${canal.name}:`, erro.message);
      }
    }
  }

  db.remover('noturno.estado');
  db.set('noturno.trancado', false);
  return { ok, falhas, canais: Object.keys(estado).length };
}

// Manda a mensagem no canal de avisos (os avisos de 10 minutos marcam o cargo)
async function anunciar(guild, tipo) {
  const canalId = cfg('avisoCanal');
  if (!canalId) return;
  const canal = guild.channels.cache.get(canalId);
  if (!canal) return;

  const msg = mensagem(tipo);
  const vars = {
    minutos: String(minutosAviso()),
    fechar: horaFechar(),
    abrir: horaAbrir(),
  };

  const marcar = tipo === 'avisoFechar' || tipo === 'avisoAbrir';
  const cargoId = cfg('cargoDorminhoca');
  const ping = marcar && cargoId ? `<@&${cargoId}>` : null;

  // Aviso de fechar e "chats fechados": só texto, com banner opcional logo abaixo
  if (ehSoTexto(tipo)) {
    const corpo = preencher(msg.texto, vars);
    const opcoes = {
      content: (ping ? `${ping}\n${corpo}` : corpo).slice(0, 2000),
      allowedMentions: ping ? { roles: [cargoId] } : { parse: [] },
      [IGNORAR_TRADUCAO]: true,
    };
    const img = banner(tipo);
    if (img) opcoes.embeds = [embedBanner(img)];
    try {
      await canal.send(opcoes);
    } catch (erro) {
      if (!img) throw erro;
      // Se a imagem não puder ser enviada, manda ao menos o texto
      console.error('[Noturno] banner falhou, enviando só o texto:', erro.message);
      delete opcoes.embeds;
      await canal.send(opcoes);
    }
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle(preencher(msg.titulo, vars))
    .setDescription(preencher(msg.texto, vars));

  const opcoes = { embeds: [embed], allowedMentions: { roles: [] } };
  if (ping) {
    opcoes.content = ping;
    opcoes.allowedMentions = { roles: [cargoId] };
  }
  await canal.send(opcoes);
}

async function executar(guild, tipo) {
  if (tipo === 'fechar') {
    await fechar(guild);
    return anunciar(guild, 'fechou');
  }
  if (tipo === 'abrir') {
    await abrir(guild);
    return anunciar(guild, 'abriu');
  }
  return anunciar(guild, tipo);
}

// Roda a cada 20 segundos e dispara o que estiver na hora
async function ciclo(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild || !cfg('ativo', false)) return;

  const t = agora();
  const chave = `${t.data} ${t.hora}`;
  const fecharH = horaFechar();
  const abrirH = horaAbrir();
  const aviso = minutosAviso();

  const eventos = [
    ['avisoFechar', deMin(paraMin(fecharH) - aviso)],
    ['fechar', fecharH],
    ['avisoAbrir', deMin(paraMin(abrirH) - aviso)],
    ['abrir', abrirH],
  ];

  for (const [tipo, hora] of eventos) {
    if (hora !== t.hora) continue;
    if (db.get(`noturno.ultimo.${tipo}`) === chave) continue; // já disparou neste minuto
    db.set(`noturno.ultimo.${tipo}`, chave);
    try {
      await executar(guild, tipo);
    } catch (erro) {
      console.error(`[Noturno] erro em ${tipo}:`, erro);
    }
  }
}

// Ao ligar o bot, corrige o estado se ele ficou fora do ar na hora de abrir/fechar
async function reconciliar(guild) {
  if (!cfg('ativo', false)) return;
  const t = agora();
  const deve = deveFechar(paraMin(t.hora), paraMin(horaFechar()), paraMin(horaAbrir()));
  const trancado = db.get('noturno.trancado', false);
  if (deve && !trancado) await fechar(guild, 'Fechamento noturno (recuperação)');
  if (deve && trancado) await expulsarDaVoz(guild, 'Fechamento noturno (recuperação)');
  if (!deve && trancado) await abrir(guild, 'Abertura da manhã (recuperação)');
}

function iniciar(client) {
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) reconciliar(guild).catch((e) => console.error('[Noturno] erro ao reconciliar:', e));
  setInterval(() => ciclo(client).catch((e) => console.error('[Noturno] erro no ciclo:', e)), 20 * 1000);
  console.log('[Noturno] agendador iniciado');
}

module.exports = {
  PADROES,
  cfg,
  cfgLista,
  horaFechar,
  horaAbrir,
  minutosAviso,
  mensagem,
  ehSoTexto,
  bannerValido,
  banner,
  embedBanner,
  canaisVoz,
  expulsarDaVoz,
  ehCanalVoz,
  preencher,
  normalizarHora,
  paraMin,
  deMin,
  agora,
  canaisAlvo,
  fechar,
  abrir,
  iniciar,
};
