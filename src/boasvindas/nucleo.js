// Boas-vindas e saída: mensagem de TEXTO (sem embed) marcando o membro, com log opcional.
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const L = require('../logs/nucleo');
const T = require('../ui/tema');

const IGNORAR_TRADUCAO = Symbol.for('atlas.mensagens.ignorar'); // não passa pelo editor de mensagens

// Textos padrão (o site pode trocar). Variáveis: {usuario} {nome} {servidor} {contagem} {id}
const PADROES = {
  entrada: 'Bem-vindo(a) à **{servidor}**, {usuario}. Você é o membro **#{contagem}**. Aproveite a house.',
  saida: '{usuario} (**{nome}**) saiu da **{servidor}**. Agora somos **{contagem}** membros.',
};

// config.boasvindas.entrada.{ativo,canal,texto,banner} | config.boasvindas.saida.{ativo,canal,texto,banner} | config.boasvindas.canalLog
const cfg = (chave, padrao) => db.get(`config.boasvindas.${chave}`, padrao);
const texto = (tipo) => cfg(`${tipo}.texto`) || PADROES[tipo];

// Banner (imagem grande) opcional: link direto de uma imagem
function bannerValido(url) {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return /^https?:\/\/\S+$/i.test(t) && t.length <= 500 ? t : null;
}
const banner = (tipo) => bannerValido(cfg(`${tipo}.banner`));

function preencher(modelo, vars) {
  return String(modelo).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}

function variaveis(member) {
  const nome = member.nickname || (member.user && (member.user.globalName || member.user.username)) || 'alguém';
  return {
    usuario: `<@${member.id}>`,
    nome,
    servidor: member.guild.name,
    contagem: member.guild.memberCount,
    id: member.id,
  };
}

async function pegarCanal(guild, id) {
  if (!id) return null;
  const canal = guild.channels.cache.get(id) || (await guild.channels.fetch(id).catch(() => null));
  return canal && canal.isTextBased() ? canal : null;
}

async function enviarTexto(guild, canalId, conteudo, userId, pingar, bannerUrl) {
  if (!canalId) return { ok: false, motivo: 'nenhum canal configurado' };
  const canal = await pegarCanal(guild, canalId);
  if (!canal) return { ok: false, motivo: 'canal não encontrado' };
  const eu = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const perms = eu && canal.permissionsFor(eu);
  if (!perms || !perms.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    return { ok: false, motivo: `sem permissão para enviar em <#${canal.id}>` };
  }
  try {
    const msg = {
      content: String(conteudo).slice(0, 2000),
      // Entrada: marca (e notifica) o membro. Saída: mostra a marcação, mas sem notificar.
      allowedMentions: pingar ? { users: [userId] } : { parse: [] },
      [IGNORAR_TRADUCAO]: true,
    };
    // Com banner, o texto continua normal e a imagem aparece logo abaixo
    if (bannerUrl) msg.embeds = [new EmbedBuilder().setColor(T.COR.base).setImage(bannerUrl)];
    await canal.send(msg);
    return { ok: true, canalId: canal.id };
  } catch (e) {
    return { ok: false, motivo: e.message };
  }
}

async function registrar(guild, emb) {
  try {
    const canal = await pegarCanal(guild, cfg('canalLog'));
    if (!canal) return;
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] }, [IGNORAR_TRADUCAO]: true });
  } catch (e) {
    console.error('[Boas-vindas] log:', e.message);
  }
}

const situacao = (r) => (r.ok ? `${T.S.ponto}  enviada em <#${r.canalId}>` : `${T.S.vazio}  não enviada: ${r.motivo}`);

async function entrada(member) {
  if (member.user.bot || !cfg('entrada.ativo', false)) return;
  const guild = member.guild;
  const r = await enviarTexto(guild, cfg('entrada.canal'), preencher(texto('entrada'), variaveis(member)), member.id, true, banner('entrada'));
  if (!r.ok) console.warn(`[Boas-vindas] entrada de ${member.id}: ${r.motivo}`);

  const nova = Date.now() - member.user.createdTimestamp < 7 * 86400000;
  await registrar(guild, L.embed('verde', 'Boas-vindas', `${L.pessoa(member.user)} entrou no servidor.`, [
    ['Conta criada', `${L.quando(member.user.createdTimestamp)}${nova ? `  ${T.S.sep}  conta nova` : ''}`, true],
    ['Total de membros', guild.memberCount, true],
    ['Mensagem', situacao(r)],
  ]));
}

async function saida(member) {
  if (member.user.bot || !cfg('saida.ativo', false)) return;
  const guild = member.guild;
  const r = await enviarTexto(guild, cfg('saida.canal'), preencher(texto('saida'), variaveis(member)), member.id, false, banner('saida'));
  if (!r.ok) console.warn(`[Boas-vindas] saída de ${member.id}: ${r.motivo}`);

  const cargos = member.roles ? [...member.roles.cache.values()].filter((x) => x.id !== guild.id).map((x) => `<@&${x.id}>`) : [];
  await registrar(guild, L.embed('vermelho', 'Saída', `${L.pessoa(member.user)} saiu do servidor.`, [
    ['Estava desde', member.joinedTimestamp ? L.quando(member.joinedTimestamp) : '—', true],
    ['Total de membros', guild.memberCount, true],
    cargos.length ? ['Cargos', L.corta(cargos.join(', '), 1000)] : null,
    ['Mensagem', situacao(r)],
  ]));
}

module.exports = { PADROES, preencher, entrada, saida};
