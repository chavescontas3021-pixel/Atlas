// Casamento: dados das cerimônias e dos casais (a parte 31 usa os casais para ranking e mimos).
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;
const MAX_CONVIDADOS = 40;
const ATIVOS = ['agendado', 'andamento', 'interrompido', 'concluido'];

// "pausa" entre as falas do Atlas (em milissegundos). Os testes colocam 0.
const ajustes = { pausa: 2500 };

const cfg = (chave, padrao) => db.get(`config.casamento.${chave}`, padrao);

// ---------- Cerimônias ----------
const cerimonias = () => db.get('casamento.cerimonias', {}) || {};
const cerimoniaDoCanal = (canalId) => db.get(`casamento.cerimonias.${canalId}`, null);
const salvarCerimonia = (c) => db.set(`casamento.cerimonias.${c.canalId}`, c);
const removerCerimonia = (canalId) => db.remover(`casamento.cerimonias.${canalId}`);

// Cerimônia em que a pessoa é um dos noivos
function cerimoniaDe(uid) {
  return Object.values(cerimonias()).find((c) => ATIVOS.includes(c.status) && (c.a === uid || c.b === uid)) || null;
}

const ehNoivo = (c, uid) => !!c && (c.a === uid || c.b === uid);

// ---------- Casais (quem já está casado) ----------
const casais = () => db.get('casamento.casais', {}) || {};
const casalDe = (uid) => {
  const id = db.get(`casamento.casalDe.${uid}`, null);
  return id ? db.get(`casamento.casais.${id}`, null) : null;
};

function registrarCasal(a, b, canalId) {
  const n = db.get('casamento.contador', 0) + 1;
  db.set('casamento.contador', n);
  const casal = { id: `c${n}`, a, b, desde: Date.now(), canalId: canalId || null };
  db.set(`casamento.casais.${casal.id}`, casal);
  db.set(`casamento.casalDe.${a}`, casal.id);
  db.set(`casamento.casalDe.${b}`, casal.id);
  return casal;
}

// ---------- Canal do casamento ----------
const P = PermissionFlagsBits;
const BASICO = [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.AddReactions, P.AttachFiles, P.EmbedLinks];

// Apaga do registro cerimônias cujo canal já não existe (apagado na mão)
function limparFantasmas(guild) {
  for (const c of Object.values(cerimonias())) {
    if (!guild.channels.cache.has(c.canalId)) removerCerimonia(c.canalId);
  }
}

async function criarCanal(guild, ua, ub, staffUserId) {
  const eu = guild.members.me ?? (await guild.members.fetchMe());
  const permissoes = [
    { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
    { id: ua.id, allow: BASICO },
    { id: ub.id, allow: BASICO },
    { id: eu.id, allow: [...BASICO, P.ManageChannels, P.ManageMessages, P.ManageRoles] },
  ];
  if (staffUserId) permissoes.push({ id: staffUserId, allow: [...BASICO, P.ManageMessages] });
  const cargoStaff = cfg('staff');
  if (cargoStaff && guild.roles.cache.has(cargoStaff)) permissoes.push({ id: cargoStaff, allow: [...BASICO, P.ManageMessages] });

  const nome = `casamento-${ua.username}-e-${ub.username}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 90);
  const opcoes = {
    name: nome,
    type: ChannelType.GuildText,
    topic: `Casamento de ${ua.username} e ${ub.username} (privado: só convidados)`,
    permissionOverwrites: permissoes,
  };
  const categoria = cfg('categoria');
  if (categoria && guild.channels.cache.has(categoria)) opcoes.parent = categoria;
  return guild.channels.create(opcoes);
}

// Dá acesso ao canal para um convidado (durante a cerimônia ele só assiste)
function darAcesso(canal, uid, podeFalar) {
  return canal.permissionOverwrites.edit(uid, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: !!podeFalar,
    AddReactions: true,
  });
}

// Tranca (ou libera) a fala de todos os convidados
async function travarConvidados(canal, c, travar) {
  for (const uid of c.convidados || []) {
    await canal.permissionOverwrites.edit(uid, { SendMessages: !travar }).catch(() => {});
  }
}

const limiteConvidados = () => Math.max(1, Number(cfg('limite', MAX_CONVIDADOS)) || MAX_CONVIDADOS);

const preencher = (texto, vars) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
const mencao = (id) => `<@${id}>`;

module.exports = {
  COR, MAX_CONVIDADOS, ATIVOS, ajustes, cfg,
  cerimonias, cerimoniaDoCanal, salvarCerimonia, removerCerimonia, cerimoniaDe, ehNoivo,
  casais, casalDe, registrarCasal, preencher, mencao,
  limparFantasmas, criarCanal, darAcesso, travarConvidados, limiteConvidados,
};
