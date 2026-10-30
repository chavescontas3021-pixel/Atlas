// Inatividade: justificativas, avisos e liberação automática de vagas.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../db');
const V = require('../vagas/nucleo');

const COR = 0xf5a3c7;
const DIA = 24 * 3600 * 1000;

const PADROES = {
  avisoDias: 7,
  liberarDias: 14,
  maxDias: 30,
  mensagens: {
    painel: {
      titulo: '🌙 Justificar inatividade',
      texto:
        'Vai ficar um tempo sem aparecer?\n' +
        'Clique no botão abaixo e diga **por quanto tempo** e o **motivo**.\n' +
        'Enquanto durar, sua vaga fica guardada. 💜',
    },
    aviso: {
      titulo: '⏰ Sentimos sua falta!',
      texto:
        'Oi, {usuario}! Faz **{dias} dia(s)** que você não aparece na house.\n' +
        'Se não voltar ou justificar em até **{restam} dia(s)**, sua vaga **{vagas}** será liberada.\n' +
        'Para justificar, use {canal}.',
    },
    liberada: {
      titulo: '📤 Vaga liberada',
      texto:
        '{usuario}, como você ficou **{dias} dia(s)** sem aparecer, a vaga **{vagas}** foi liberada.\n' +
        'Quando quiser voltar, é só pedir de novo! 💜',
    },
  },
};

const cfg = (chave, padrao) => db.get(`config.inatividade.${chave}`, padrao);
const mensagem = (tipo) => ({ ...PADROES.mensagens[tipo], ...(cfg(`mensagens.${tipo}`) || {}) });
const preencher = (texto, vars) => String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

const avisoDias = () => Number(cfg('avisoDias', PADROES.avisoDias));
const liberarDias = () => Number(cfg('liberarDias', PADROES.liberarDias));
const maxDias = () => Number(cfg('maxDias', PADROES.maxDias));

// "7", "7d", "7 dias", "2 semanas", "1 mês" -> número de dias
function parseDias(txt) {
  const t = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const m = t.match(/^(\d{1,3})\s*([a-z]*)$/);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2];
  if (!n) return null;
  if (!u || u[0] === 'd') return n;
  if (u[0] === 's') return n * 7;
  if (u[0] === 'm') return n * 30;
  return null;
}

// ---------- Estado ----------
const justificativa = (uid) => db.get(`inatividade.just.${uid}`, null);
const justificativas = () => Object.values(db.get('inatividade.just', {}) || {});
const ultima = (uid) => db.get(`inatividade.ultima.${uid}`, 0);
const fimUltimo = (uid) => db.get(`inatividade.fimUltimo.${uid}`, 0);

// Momento a partir do qual contamos os dias sem aparecer
function marco(uid, vagas) {
  const desde = Math.max(0, ...vagas.map((v) => v.desde || 0));
  return Math.max(ultima(uid), desde, fimUltimo(uid));
}

// ---------- Atividade (mensagens) ----------
const ultimoRegistro = new Map();
function registrarAtividade(uid) {
  const agora = Date.now();
  if (agora - (ultimoRegistro.get(uid) || 0) < 60 * 1000) return;
  ultimoRegistro.set(uid, agora);
  if (V.doUsuario(uid).length === 0) return; // só importa para quem ocupa vaga
  db.set(`inatividade.ultima.${uid}`, agora);
  db.remover(`inatividade.avisados.${uid}`);
}

// ---------- Justificar ----------
// Retorna { erro } ou { j }
async function justificar(guild, user, tempoTxt, motivo) {
  if (V.doUsuario(user.id).length === 0) {
    return { erro: 'Você não ocupa nenhuma vaga, então não precisa justificar. 💜' };
  }
  const dias = parseDias(tempoTxt);
  if (!dias) return { erro: 'Não entendi o tempo. Use algo como `7`, `7 dias`, `2 semanas` ou `1 mês`.' };
  if (dias > maxDias()) return { erro: `O máximo permitido é **${maxDias()} dias**. Se precisar de mais, fale com a staff.` };

  const agora = Date.now();
  const j = { userId: user.id, inicio: agora, fim: agora + dias * DIA, dias, motivo: String(motivo || '').trim() || 'Não informado' };
  db.set(`inatividade.just.${user.id}`, j);
  db.remover(`inatividade.avisados.${user.id}`);

  const canal = guild.channels.cache.get(cfg('canal'));
  if (canal) {
    const emb = new EmbedBuilder()
      .setColor(COR)
      .setTitle('🌙 Inatividade justificada')
      .setDescription(`**Membro:** <@${user.id}>\n**Volta em:** <t:${Math.floor(j.fim / 1000)}:D> (<t:${Math.floor(j.fim / 1000)}:R>)\n**Motivo:** ${j.motivo}`);
    await canal.send({ embeds: [emb], allowedMentions: { parse: [] } }).catch(() => {});
  }
  return { j };
}

function encerrarJustificativa(uid) {
  const j = justificativa(uid);
  if (!j) return false;
  db.remover(`inatividade.just.${uid}`);
  db.set(`inatividade.fimUltimo.${uid}`, Date.now());
  db.remover(`inatividade.avisados.${uid}`);
  return true;
}

// ---------- Painel ----------
async function publicarPainel(canal) {
  const m = mensagem('painel');
  const emb = new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(m.texto);
  const linha = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('inativ:abrir').setLabel('Justificar inatividade').setEmoji('🌙').setStyle(ButtonStyle.Primary),
  );
  return canal.send({ embeds: [emb], components: [linha] });
}

// ---------- Avisos ----------
async function avisar(client, guild, uid, tipo, vars) {
  const m = mensagem(tipo);
  const emb = new EmbedBuilder().setColor(COR).setTitle(m.titulo).setDescription(preencher(m.texto, vars));
  const user = await client.users.fetch(uid).catch(() => null);
  if (user) await user.send({ embeds: [emb] }).catch(() => {});
  const canal = guild.channels.cache.get(cfg('canalAviso'));
  if (canal) await canal.send({ content: `<@${uid}>`, embeds: [emb], allowedMentions: { users: [uid] } }).catch(() => {});
}

// Quem ficou sem nenhuma vaga perde o cargo de verificado e volta a ser "sem vaga"
async function trocarCargos(guild, uid) {
  if (cfg('trocarCargos', true) === false) return;
  if (V.doUsuario(uid).length > 0) return;
  const verificado = db.get('config.recepcao.cargos.verificado', null);
  const semVaga = db.get('config.recepcao.cargos.semVaga', null);
  const membro = await guild.members.fetch(uid).catch(() => null);
  if (!membro) return;
  if (verificado && membro.roles.cache.has(verificado)) await membro.roles.remove(verificado, 'Vaga liberada por inatividade').catch(() => {});
  if (semVaga && !membro.roles.cache.has(semVaga)) await membro.roles.add(semVaga, 'Vaga liberada por inatividade').catch(() => {});
}

// ---------- Verificação periódica ----------

async function tick(client, agora = Date.now()) {
  if (!cfg('ativo', false)) return;
  for (const guild of client.guilds.cache.values()) {
    const porUsuario = new Map();
    for (const v of V.todas()) {
      if (!v.ocupanteId) continue;
      if (!porUsuario.has(v.ocupanteId)) porUsuario.set(v.ocupanteId, []);
      porUsuario.get(v.ocupanteId).push(v);
    }
    for (const [uid, vagas] of porUsuario) {
      const j = justificativa(uid);
      if (j) {
        if (j.fim > agora) continue; // justificativa em andamento: vaga guardada
        db.remover(`inatividade.just.${uid}`);
        db.set(`inatividade.fimUltimo.${uid}`, j.fim);
        const user = await client.users.fetch(uid).catch(() => null);
        if (user) await user.send('🌙 Sua justificativa de inatividade terminou. Que bom ter você de volta! Passe na house para manter sua vaga. 💜').catch(() => {});
      }
      const base = marco(uid, vagas);
      const dias = (agora - base) / DIA;
      const nomes = vagas.map((v) => v.nome).join(', ');
      const canalJust = cfg('canal');
      const vars = { usuario: `<@${uid}>`, vagas: nomes, canal: canalJust ? `<#${canalJust}>` : 'o canal de justificativas', dias: Math.floor(dias) };

      if (dias >= liberarDias()) {
        for (const v of vagas) await V.liberar(guild, v);
        await trocarCargos(guild, uid);
        db.remover(`inatividade.avisados.${uid}`);
        await avisar(client, guild, uid, 'liberada', vars);
      } else if (dias >= avisoDias() && db.get(`inatividade.avisados.${uid}`, 0) !== base) {
        db.set(`inatividade.avisados.${uid}`, base);
        await avisar(client, guild, uid, 'aviso', { ...vars, restam: Math.max(1, Math.ceil(liberarDias() - dias)) });
      }
    }
  }
}

module.exports = {
  PADROES, DIA, cfg, mensagem, preencher, avisoDias, liberarDias, maxDias, parseDias,
  justificativa, justificativas, ultima, marco, registrarAtividade,
  justificar, encerrarJustificativa, publicarPainel, tick,
};
// fim do arquivo
