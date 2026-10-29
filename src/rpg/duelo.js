// Duelo por turnos: os dois escolhem seus ataques, igual ao combate do explorar.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CLASSES } = require('./dados');
const N = require('./nucleo');
const B = require('../personagem/batalha');
const Pers = require('../personagem/nucleo');

// Visual do golpe de cada classe no GIF
const VISUAL = { guerreiro: 'cruz', mago: 'explosao', arqueiro: 'flechas', curandeiro: 'luz', ladino: 'furtivo' };

const duelos = new Map(); // id -> estado
const TEMPO_TURNO = 3 * 60 * 1000;
const MAX_TURNOS = 60;
let contador = 0;

const rolar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function golpe(atk, critChance, defesa, { mult = 1, critGarantido = false, ignoraDef = false } = {}) {
  const base = atk + rolar(0, 4);
  const crit = critGarantido || Math.random() * 100 < critChance;
  const red = ignoraDef ? 0 : Math.floor(defesa / 2);
  const dano = Math.max(1, Math.round(base * mult * (crit ? 1.6 : 1)) - red);
  return { dano, crit };
}

const emDuelo = (userId) => [...duelos.values()].some((d) => d.a.id === userId || d.b.id === userId);
const obter = (id) => duelos.get(id) || null;
const lado = (d, userId) => (d.a.id === userId ? d.a : d.b.id === userId ? d.b : null);
const nomeDe = (x) => x.j.personagem || `<@${x.id}>`;

function iniciar(idA, jA, idB, jB, aposta, aoExpirar) {
  const id = `${Date.now().toString(36)}${(contador++).toString(36)}`;
  const mk = (uid, j) => ({ id: uid, j, hp: j.hpMax, cd: 0, def: false });
  const A = mk(idA, jA);
  const Bx = mk(idB, jB);
  // Quem tem mais agilidade começa
  const turno = jA.attr.agilidade >= jB.attr.agilidade ? 'a' : 'b';
  const d = {
    id, a: A, b: Bx, turno, aposta, turnos: 0, eventos: [], hpIni: { a: A.hp, b: Bx.hp }, log: ['⚔️ O duelo começou!'], msg: null, timer: null, aoExpirar,
  };
  duelos.set(id, d);
  armarTimer(d);
  return d;
}

function armarTimer(d) {
  clearTimeout(d.timer);
  d.timer = setTimeout(() => {
    if (!duelos.has(d.id) || !d.aoExpirar) return;
    d.aoExpirar(d).catch((e) => console.error('[Duelo] tempo:', e));
  }, TEMPO_TURNO);
}

const vez = (d) => (d.turno === 'a' ? d.a : d.b);
const alvoDa = (d) => (d.turno === 'a' ? d.b : d.a);

// tipo: atq | hab | def | des
function agir(d, tipo) {
  const x = vez(d);
  const y = alvoDa(d);
  const cl = CLASSES[x.j.classe];
  const linhas = [];
  d.eventos = [];
  d.hpIni = { a: d.a.hp, b: d.b.hp };
  const reg = (ev) => d.eventos.push({ por: d.turno, hpA: Math.max(0, d.a.hp), hpB: Math.max(0, d.b.hp), ...ev });

  if (tipo === 'hab' && x.cd > 0) return { invalido: `Sua habilidade está em recarga (${x.cd} turno(s)).` };

  if (tipo === 'des') {
    d.log = [`🏳️ ${nomeDe(x)} desistiu do duelo!`];
    return { fim: true, vencedor: y };
  }

  if (tipo === 'def') {
    x.def = true;
    linhas.push(`🛡️ ${nomeDe(x)} se preparou para defender (dano pela metade no próximo golpe).`);
    reg({ tipo: 'def' });
  } else {
    const opts = {};
    let nome = 'Ataque';
    let cura = 0;
    if (tipo === 'hab') {
      const h = cl.hab;
      opts.mult = h.mult;
      if (h.ignoraDef) opts.ignoraDef = true;
      if (h.tipo === 'critico') opts.critGarantido = true;
      if (h.tipo === 'cura') cura = Math.round(x.j.hpMax * h.cura);
      nome = h.nome;
      x.cd = 4;
    }
    if (Math.random() * 100 < N.esquiva(y.j)) {
      linhas.push(`💨 ${nomeDe(y)} desviou de **${nome}**!`);
      reg({ tipo: tipo === 'hab' ? 'hab' : 'atq', visual: tipo === 'hab' ? (VISUAL[x.j.classe] || 'cruz') : 'corte', esq: true });
    } else {
      const r = golpe(N.ataque(x.j), N.critChance(x.j), N.defesa(y.j), opts);
      let dano = r.dano;
      if (y.def) {
        dano = Math.max(1, Math.floor(dano / 2));
      }
      y.hp -= dano;
      linhas.push(`${tipo === 'hab' ? '💥' : '🗡️'} ${nomeDe(x)} usou **${nome}**: ${dano} de dano${r.crit ? ' (**CRÍTICO!**)' : ''}${y.def ? ' (defendido)' : ''}.`);
      reg({ tipo: tipo === 'hab' ? 'hab' : 'atq', visual: tipo === 'hab' ? (VISUAL[x.j.classe] || 'cruz') : 'corte', dano, crit: r.crit, cura: 0 });
    }
    y.def = false;
    if (cura) {
      const c = Math.min(cura, x.j.hpMax - x.hp);
      x.hp += c;
      linhas.push(`✨ ${nomeDe(x)} recuperou **${c}** HP.`);
      const ult = d.eventos[d.eventos.length - 1];
      if (ult) { ult.cura = c; ult.hpA = Math.max(0, d.a.hp); ult.hpB = Math.max(0, d.b.hp); }
    }
  }

  d.log = linhas;
  d.turnos++;
  if (x.cd > 0 && tipo !== 'hab') x.cd--;

  if (y.hp <= 0) {
    y.hp = 0;
    return { fim: true, vencedor: x };
  }
  if (d.turnos >= MAX_TURNOS) {
    const pa = d.a.hp / d.a.j.hpMax;
    const pb = d.b.hp / d.b.j.hpMax;
    d.log.push('⏳ O duelo foi longo demais: vence quem tem mais vida.');
    return { fim: true, vencedor: pa >= pb ? d.a : d.b };
  }
  d.turno = d.turno === 'a' ? 'b' : 'a';
  armarTimer(d);
  return {};
}

// Paga o prêmio e encerra
function finalizar(d, vencedor) {
  clearTimeout(d.timer);
  duelos.delete(d.id);
  const perdedor = vencedor.id === d.a.id ? d.b : d.a;
  const jv = N.obter(vencedor.id) || vencedor.j;
  const jp = N.obter(perdedor.id) || perdedor.j;
  const valor = Math.min(d.aposta, jp.moedas);
  jv.moedas += valor;
  jp.moedas -= valor;
  jv.vitorias++;
  jp.derrotas++;
  const subiu = N.ganharXp(jv, 20);
  N.salvar(vencedor.id, jv);
  N.salvar(perdedor.id, jp);
  return { vencedor, perdedor, valor, subiu, nivel: jv.nivel };
}

function embedDuelo(d) {
  const linha = (x) => {
    const cl = CLASSES[x.j.classe];
    return {
      name: `${cl.emoji} ${x.j.personagem || 'Jogador'} ${x.def ? '🛡️' : ''}`,
      value: `${N.barra(x.hp, x.j.hpMax)} ${x.hp}/${x.j.hpMax}`,
      inline: false,
    };
  };
  const x = vez(d);
  const cl = CLASSES[x.j.classe];
  return new EmbedBuilder()
    .setColor(N.COR)
    .setTitle(`⚔️ Duelo${d.aposta ? ` · ⭐ ${d.aposta}` : ''}`)
    .addFields(linha(d.a), linha(d.b), { name: 'Último turno', value: d.log.join('\n').slice(0, 1000) || '—' })
    .setImage(`attachment://${B.ARQUIVO}`)
    .setFooter({ text: x.cd > 0 ? `${cl.hab.nome}: recarga ${x.cd} turno(s)` : `${cl.hab.nome}: pronta! · ${cl.hab.desc}` });
}

// GIF da cena do turno. perdedorId: quando o duelo acabou, quem cai (some da cena).
function arquivos(d, perdedorId) {
  return [B.anexo({
    esq: { tipo: 'heroi', app: Pers.visual(d.a.id) },
    dir: { tipo: 'heroi', app: Pers.visual(d.b.id) },
    eventos: d.eventos || [],
    hpIni: d.hpIni || { a: d.a.hp, b: d.b.hp },
    hpMax: { a: d.a.j.hpMax, b: d.b.j.hpMax },
    fim: !!perdedorId,
    perdedor: perdedorId === d.b.id ? 'b' : 'a',
  })];
}

function embedFim(d, r, extra) {
  return new EmbedBuilder()
    .setColor(N.COR)
    .setTitle('⚔️ Resultado do duelo')
    .setImage(`attachment://${B.ARQUIVO}`)
    .setDescription(
      `${d.log.join('\n')}\n\n🏆 Vencedor: <@${r.vencedor.id}>\n💀 Perdedor: <@${r.perdedor.id}>\n` +
      `❤️ Vida final: <@${d.a.id}> ${Math.max(0, d.a.hp)}/${d.a.j.hpMax} · <@${d.b.id}> ${Math.max(0, d.b.hp)}/${d.b.j.hpMax}\n` +
      `${r.valor ? `⭐ Aposta: ${r.valor} stars\n` : ''}✨ Vencedor ganhou +20 XP${r.subiu ? ` e subiu para o nível ${r.nivel}!` : '.'}${extra ? `\n${extra}` : ''}`,
    );
}

function botoes(d) {
  const x = vez(d);
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rpg:u:atq:${d.id}`).setLabel('Atacar').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`rpg:u:hab:${d.id}`).setLabel('Habilidade').setEmoji('💥').setStyle(ButtonStyle.Primary).setDisabled(x.cd > 0),
    new ButtonBuilder().setCustomId(`rpg:u:def:${d.id}`).setLabel('Defender').setEmoji('🛡️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`rpg:u:des:${d.id}`).setLabel('Desistir').setEmoji('🏳️').setStyle(ButtonStyle.Secondary),
  )];
}

module.exports = { iniciar, obter, lado, vez, emDuelo, agir, finalizar, embedDuelo, embedFim, arquivos, botoes };
// fim do arquivo
