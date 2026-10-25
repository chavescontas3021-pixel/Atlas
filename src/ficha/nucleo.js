// Fichas de personagem da house.
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;

// Primeiro formulário (5 campos, limite do Discord)
const CAMPOS_A = [
  { id: 'nome', rotulo: 'Nome do personagem', estilo: 'curto', max: 60, obrigatorio: true },
  { id: 'obra', rotulo: 'Obra', estilo: 'curto', max: 80, obrigatorio: true },
  { id: 'idade', rotulo: 'Idade, espécie e gênero', estilo: 'curto', max: 80, obrigatorio: false },
  { id: 'personalidade', rotulo: 'Personalidade', estilo: 'longo', max: 900, obrigatorio: true },
  { id: 'historia', rotulo: 'História', estilo: 'longo', max: 1000, obrigatorio: false },
];

// Segundo formulário (detalhes)
const CAMPOS_B = [
  { id: 'aparencia', rotulo: 'Aparência', estilo: 'longo', max: 600, obrigatorio: false },
  { id: 'habilidades', rotulo: 'Habilidades e poderes', estilo: 'longo', max: 600, obrigatorio: false },
  { id: 'gostos', rotulo: 'Gostos e hobbies', estilo: 'longo', max: 500, obrigatorio: false },
  { id: 'medos', rotulo: 'Medos e fraquezas', estilo: 'longo', max: 500, obrigatorio: false },
  { id: 'extra', rotulo: 'Relações e extras', estilo: 'longo', max: 500, obrigatorio: false },
];

const EMOJI = { personalidade: '💭', historia: '📜', aparencia: '👤', habilidades: '✨', gostos: '💜', medos: '🌑', extra: '🔗' };

function cfg(chave, padrao) {
  return db.get(`config.ficha.${chave}`, padrao);
}
const limite = () => Number(cfg('limite', 3));

function norm(txt) {
  return String(txt || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-‏⁠﻿­]/g, '')
    .replace(/[_*~`|]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Banco ----------
const todas = () => Object.values(db.get('fichas.lista', {}) || {});
const obter = (id) => db.get(`fichas.lista.${id}`, null);
const salvar = (f) => db.set(`fichas.lista.${f.id}`, f);
const remover = (id) => db.remover(`fichas.lista.${id}`);
const doUsuario = (uid) => todas().filter((f) => f.userId === uid);

function proximoId() {
  const n = db.get('fichas.contador', 0) + 1;
  db.set('fichas.contador', n);
  return String(n);
}

// Acha a ficha pelo id ou nome. Sem referência: só funciona se a pessoa tiver exatamente uma.
function acharFicha(uid, ref) {
  const lista = doUsuario(uid);
  if (!ref) return lista.length === 1 ? lista[0] : null;
  const r = norm(ref);
  return lista.find((f) => f.id === ref || norm(f.nome) === r) || null;
}

function nomeEmUso(uid, nome, ignorarId) {
  const r = norm(nome);
  return doUsuario(uid).some((f) => f.id !== ignorarId && norm(f.nome) === r);
}

// ---------- Visual ----------
function embedFicha(f, usuario, imagemUrl) {
  const emb = new EmbedBuilder().setColor(COR).setTitle(`📖 ${f.nome}`).setFooter({ text: `Ficha #${f.id}` });
  const topo = [`**Obra:** ${f.obra}`];
  if (f.idade) topo.push(`**Idade / espécie:** ${f.idade}`);
  topo.push(`**Jogador(a):** <@${f.userId}>`);
  emb.setDescription(topo.join('\n'));
  if (usuario && usuario.displayAvatarURL) emb.setThumbnail(usuario.displayAvatarURL());
  for (const c of [...CAMPOS_A, ...CAMPOS_B]) {
    if (!EMOJI[c.id] || !f[c.id]) continue;
    emb.addFields({ name: `${EMOJI[c.id]} ${c.rotulo}`, value: String(f[c.id]).slice(0, 1024), inline: false });
  }
  if (imagemUrl) emb.setImage(imagemUrl);
  return emb;
}

const linkDaMensagem = (guildId, f) => (f.canalId && f.msgId ? `https://discord.com/channels/${guildId}/${f.canalId}/${f.msgId}` : null);

// ---------- Mensagem publicada no canal de fichas ----------
async function buscarMensagem(guild, f) {
  if (!f.canalId || !f.msgId) return null;
  const canal = guild.channels.cache.get(f.canalId);
  if (!canal) return null;
  return canal.messages.fetch(f.msgId).catch(() => null);
}

// Cria ou atualiza a mensagem da ficha. `imagem` = { buffer, ext } quando há imagem nova.
async function publicar(guild, f, usuario, imagem) {
  const canal = guild.channels.cache.get(cfg('canal'));
  if (!canal) throw new Error('Canal de fichas não definido.');

  let msg = await buscarMensagem(guild, f);
  if (!msg && f.imagemNome && !imagem) f.imagemNome = null; // a mensagem (e a imagem) se perderam

  if (imagem) f.imagemNome = `ficha-${f.id}.${imagem.ext}`;
  const embed = embedFicha(f, usuario, f.imagemNome ? `attachment://${f.imagemNome}` : null);
  const arquivo = imagem ? new AttachmentBuilder(imagem.buffer, { name: f.imagemNome }) : null;

  if (msg) {
    await msg.edit(arquivo ? { embeds: [embed], files: [arquivo], attachments: [] } : { embeds: [embed] });
  } else {
    msg = await canal.send({ embeds: [embed], files: arquivo ? [arquivo] : [] });
    f.canalId = canal.id;
    f.msgId = msg.id;
  }
  f.atualizadoEm = Date.now();
  salvar(f);
  return msg;
}

// URL "fresca" da imagem (as do Discord expiram, então buscamos de novo a cada vez)
async function urlDaImagem(guild, f) {
  if (!f.imagemNome) return null;
  const msg = await buscarMensagem(guild, f);
  const anexo = msg && msg.attachments && msg.attachments.first();
  return anexo ? anexo.url : null;
}

async function baixarImagem(anexo) {
  const tipos = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = tipos[String(anexo.contentType || '').split(';')[0]];
  if (!ext) return { erro: 'Envie uma imagem PNG, JPG, WEBP ou GIF.' };
  if (anexo.size > 8 * 1024 * 1024) return { erro: 'A imagem pode ter no máximo 8 MB.' };
  try {
    const r = await fetch(anexo.url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { erro: 'Não consegui baixar a imagem. Tente de novo.' };
    return { buffer: Buffer.from(await r.arrayBuffer()), ext };
  } catch {
    return { erro: 'Não consegui baixar a imagem. Tente de novo.' };
  }
}

async function apagarFicha(guild, f) {
  const msg = await buscarMensagem(guild, f);
  if (msg) await msg.delete().catch(() => {});
  remover(f.id);
}

module.exports = {
  CAMPOS_A, CAMPOS_B, cfg, limite, norm,
  todas, obter, salvar, remover, doUsuario, proximoId, acharFicha, nomeEmUso,
  embedFicha, linkDaMensagem, publicar, urlDaImagem, baixarImagem, apagarFicha,
};
