const db = require('../db');

// Passos mostrados ao membro (o "id" é usado no comando /recepcao canal)
const PASSOS = [
  { id: 'pings', nome: 'Pings', desc: 'Escolha os cargos de ping que você quer receber.' },
  { id: 'apresentacao', nome: 'Apresentação', desc: 'Faça a sua apresentação.' },
  { id: 'fechar_vaga', nome: 'Fechar vaga (obrigatório)', desc: 'Feche a vaga do seu personagem. É o único passo exigido para a verificação.' },
  { id: 'aniversario', nome: 'Aniversário', desc: 'Escolha o seu cargo de aniversário.' },
  { id: 'registro', nome: 'Registro', desc: 'Escolha os seus cargos de registro.' },
  { id: 'cor', nome: 'Cor', desc: 'Escolha a cor do seu nome.' },
  { id: 'avaliar', nome: 'Avaliar house e staff', desc: 'Conte o que achou da house e da staff.' },
];

// Valores padrão (tudo isso pode ser mudado por comandos)
const PADROES = {
  moldes: [
    '{emoji} {personagem}',
    '{personagem} {emoji}',
    '【{emoji}】{personagem}',
    '✦ {personagem} {emoji}',
    '{emoji} ⟡ {personagem}',
  ],
  emojis: ['🌸', '🎀', '⭐', '🌙', '🔥', '💜', '🍓', '🦋', '🐱', '🐰'],
  apagarSegundos: 60,
  mensagens: {
    boasVindas: {
      titulo: '✨ Bem-vindo(a) à {servidor}!',
      texto:
        'Oi, {usuario}! Eu sou o **Atlas** e vou te ajudar a entrar na house.\n\n' +
        '**Passo 1:** me diga aqui no chat o nome do **personagem** que você quer usar. Eu vou conferir se a vaga está livre.',
    },
    passos: {
      titulo: '📋 Seus próximos passos',
      texto: 'Seu nome já está pronto: **{nick}**\n\nFaça os passos abaixo e, quando terminar, aperte **Verificar**.',
    },
    sucesso: {
      titulo: '✅ Tudo certo!',
      texto: 'Vaga confirmada, {usuario}! Agora você é **{nick}** e está verificado(a). Aproveite a house! 💜',
    },
  },
};

const LIMITE_MENSAGENS = 1000;

function cfg(chave, padrao) {
  return db.get(`config.recepcao.${chave}`, padrao);
}

function moldes() {
  const m = cfg('moldes');
  return Array.isArray(m) && m.length ? m : PADROES.moldes;
}

function emojis() {
  const e = cfg('emojis');
  return Array.isArray(e) && e.length ? e : PADROES.emojis;
}

function mensagem(tipo) {
  return { ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) };
}

// Troca {usuario}, {nick} etc. pelos valores
function preencher(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

// minúsculas, sem acentos e sem espaços repetidos
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200b-\u200f\u2060\ufeff\u00ad]/g, '')
    .replace(/[\u3164\u115f\u1160\u2800]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapar(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Monta o apelido respeitando o limite de 32 caracteres do Discord
function montarNick(molde, personagem, emoji) {
  const semNome = molde.replace(/\{personagem\}/g, '').replace(/\{emoji\}/g, () => emoji);
  const espaco = Math.max(1, 32 - Array.from(semNome).length);
  const nome = Array.from(personagem).slice(0, espaco).join('');
  const nick = molde
    .replace(/\{personagem\}/g, () => nome)
    .replace(/\{emoji\}/g, () => emoji);
  return Array.from(nick).slice(0, 32).join('');
}

// Busca mensagens antigas de um canal, de 100 em 100
async function buscarMensagens(canal, limite) {
  const todas = [];
  let antes;
  while (todas.length < limite) {
    const lote = await canal.messages.fetch({ limit: 100, ...(antes ? { before: antes } : {}) });
    if (lote.size === 0) break;
    todas.push(...lote.values());
    antes = lote.last().id;
    if (lote.size < 100) break;
  }
  return todas;
}

// Junta o texto da mensagem com o texto dos embeds
function textoComponentes(lista) {
  let t = '';
  for (const c of lista || []) {
    if (c.content) t += ' ' + c.content;
    if (c.components) t += textoComponentes(c.components);
  }
  return t;
}

function textoDaMensagem(msg) {
  let texto = msg.content || '';
  for (const e of msg.embeds) {
    const partes = [e.title, e.description, e.author && e.author.name, e.footer && e.footer.text];
    for (const f of e.fields || []) partes.push(f.name, f.value);
    texto += ' ' + partes.filter(Boolean).join(' ');
  }
  return texto + textoComponentes(msg.components);
}

// Procura o personagem no canal "fechar vaga".
// ocupada = alguém (que não é o membro) já fechou; fechada = o próprio membro fechou.
async function procurarVaga(guild, personagem, userId) {
  const id = cfg('canais.fechar_vaga');
  if (!id) return { erro: 'O canal de fechar vaga ainda não foi configurado.' };

  const canal = await guild.channels.fetch(id).catch(() => null);
  if (!canal || !canal.isTextBased()) return { erro: 'Não consegui acessar o canal de fechar vaga.' };

  const alvo = normalizar(personagem);
  if (!alvo) return { erro: 'Nome de personagem inválido.' };
  const regex = new RegExp(`(^|[^a-z0-9])${escapar(alvo)}([^a-z0-9]|$)`);

  let mensagens;
  try {
    mensagens = await buscarMensagens(canal, LIMITE_MENSAGENS);
  } catch (e) {
    return { erro: 'Não tenho permissão para ler o canal de fechar vaga.' };
  }

  let ocupada = null;
  let fechada = null;
  for (const m of mensagens) {
    if (!regex.test(normalizar(textoDaMensagem(m)))) continue;
    const doMembro = m.author.id === userId || m.mentions.users.has(userId);
    if (doMembro) fechada = fechada || m;
    else ocupada = ocupada || m;
  }
  return { ocupada, fechada };
}

module.exports = {
  PASSOS,
  PADROES,
  cfg,
  moldes,
  emojis,
  mensagem,
  preencher,
  normalizar,
  montarNick,
  procurarVaga,
};
