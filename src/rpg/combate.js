// Combate por turnos (monstros) e simulação de duelos.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CLASSES, ITENS, MONSTROS } = require('./dados');
const N = require('./nucleo');

const ativos = new Map(); // userId -> estado do combate
const EXPIRA = 10 * 60 * 1000;

const rolar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function golpe(atk, critChance, defesa, { mult = 1, critGarantido = false, ignoraDef = false } = {}) {
  const base = atk + rolar(0, 4);
  const crit = critGarantido || Math.random() * 100 < critChance;
  const red = ignoraDef ? 0 : Math.floor(defesa / 2);
  const dano = Math.max(1, Math.round(base * mult * (crit ? 1.6 : 1)) - red);
  return { dano, crit };
}

function escolherMonstro(nivel) {
  const possiveis = MONSTROS.filter((m) => m.nivel <= nivel + 2);
  const alvo = possiveis.slice(-3);
  const m = alvo[rolar(0, alvo.length - 1)];
  const esc = 1 + Math.max(0, nivel - m.nivel) * 0.08;
  const hp = Math.round(m.hp * esc);
  return { ...m, hp, hpMax: hp, atk: Math.round(m.atk * esc), def: Math.round(m.def * esc) };
}

function iniciar(userId, j) {
  const antigo = ativos.get(userId);
  if (antigo && Date.now() - antigo.inicio < EXPIRA) return null;
  const e = { userId, monstro: escolherMonstro(j.nivel), cdHab: 0, log: ['⚔️ O combate começou!'], inicio: Date.now() };
  ativos.set(userId, e);
  return e;
}

function obterAtivo(userId) {
  const e = ativos.get(userId);
  if (!e) return null;
  if (Date.now() - e.inicio > EXPIRA) { ativos.delete(userId); return null; }
  return e;
}

function agir(e, j, tipo) {
  const cl = CLASSES[j.classe];
  const m = e.monstro;
  const linhas = [];

  if (tipo === 'hab' && e.cdHab > 0) return { invalido: `Sua habilidade está em recarga (${e.cdHab} turno(s)).` };

  if (tipo === 'poc') {
    const id = ['pocao_p', 'pocao_m', 'pocao_g'].find((i) => (j.inv[i] || 0) > 0);
    if (!id) return { invalido: 'Você não tem poções.' };
    if (j.hp >= j.hpMax) return { invalido: 'Sua vida já está cheia.' };
    N.removerItem(j, id, 1);
    const cura = Math.min(ITENS[id].cura, j.hpMax - j.hp);
    j.hp += cura;
    linhas.push(`🧪 Você usou **${ITENS[id].nome}** e recuperou **${cura}** HP.`);
  } else if (tipo === 'fug') {
    const chance = Math.min(85, 45 + j.attr.agilidade * 2);
    if (Math.random() * 100 < chance) {
      e.log = ['🏃 Você fugiu do combate!'];
      return { fim: 'fuga' };
    }
    linhas.push('🏃 Você tentou fugir, mas falhou!');
  } else {
    const opts = {};
    let nome = 'Ataque';
    let cura = 0;
    if (tipo === 'hab') {
      const h = cl.hab;
      opts.mult = h.mult;
      if (h.ignoraDef) opts.ignoraDef = true;
      if (h.tipo === 'critico') opts.critGarantido = true;
      if (h.tipo === 'cura') cura = Math.round(j.hpMax * h.cura);
      nome = h.nome;
      e.cdHab = 4;
    }
    const r = golpe(N.ataque(j), N.critChance(j), m.def, opts);
    m.hp -= r.dano;
    linhas.push(`${tipo === 'hab' ? '💥' : '🗡️'} **${nome}**: ${r.dano} de dano${r.crit ? ' (**CRÍTICO!**)' : ''}.`);
    if (cura) {
      const c = Math.min(cura, j.hpMax - j.hp);
      j.hp += c;
      linhas.push(`✨ Você recuperou **${c}** HP.`);
    }
  }

  if (m.hp <= 0) {
    m.hp = 0;
    e.log = linhas;
    return { fim: 'vitoria' };
  }

  // Turno do monstro
  if (Math.random() * 100 < N.esquiva(j)) {
    linhas.push(`💨 Você desviou do ataque de ${m.nome}!`);
  } else {
    const r = golpe(Math.round(m.atk * rolar(80, 120) / 100), 5, N.defesa(j));
    j.hp -= r.dano;
    linhas.push(`${m.emoji} ${m.nome} causou **${r.dano}** de dano${r.crit ? ' (**CRÍTICO!**)' : ''}.`);
  }
  if (e.cdHab > 0) e.cdHab--;

  e.log = linhas;
  if (j.hp <= 0) {
    j.hp = 0;
    return { fim: 'derrota' };
  }
  return {};
}

function finalizar(e, j, fim) {
  ativos.delete(e.userId);
  const m = e.monstro;
  const res = { xp: 0, moedas: 0, drop: null, subiu: 0, perda: 0 };
  if (fim === 'vitoria') {
    res.xp = m.xp;
    res.moedas = Math.round(rolar(m.moedas[0], m.moedas[1]) * (1 + j.attr.sorte * 0.01));
    j.moedas += res.moedas;
    j.vitorias++;
    if (Math.random() < m.drop.chance + j.attr.sorte * 0.005) {
      N.addItem(j, m.drop.item, 1);
      res.drop = m.drop.item;
    }
    res.subiu = N.ganharXp(j, res.xp);
  } else if (fim === 'derrota') {
    res.perda = Math.floor(j.moedas * 0.1);
    j.moedas -= res.perda;
    j.hp = Math.max(1, Math.ceil(j.hpMax * 0.3));
    j.derrotas++;
  }
  N.salvar(e.userId, j);
  return res;
}

function embedCombate(e, j) {
  const m = e.monstro;
  const cl = CLASSES[j.classe];
  return new EmbedBuilder()
    .setColor(N.COR)
    .setTitle(`${m.emoji} ${m.nome} (Nv ${m.nivel})`)
    .addFields(
      { name: `${m.emoji} Monstro`, value: `${N.barra(m.hp, m.hpMax)} ${m.hp}/${m.hpMax}`, inline: false },
      { name: `${cl.emoji} ${j.personagem || 'Você'}`, value: `${N.barra(j.hp, j.hpMax)} ${j.hp}/${j.hpMax}`, inline: false },
      { name: 'Último turno', value: e.log.join('\n').slice(0, 1000) || '—', inline: false },
    )
    .setFooter({ text: e.cdHab > 0 ? `${cl.hab.nome}: recarga ${e.cdHab} turno(s)` : `${cl.hab.nome}: pronta! · ${cl.hab.desc}` });
}

function embedFim(e, j, fim, res) {
  const m = e.monstro;
  const emb = new EmbedBuilder().setColor(N.COR).setTitle(`${m.emoji} ${m.nome} (Nv ${m.nivel})`);
  if (fim === 'vitoria') {
    let d = `🏆 **Vitória!**\n${e.log.join('\n')}\n\n✨ +${res.xp} XP · ⭐ +${res.moedas} stars`;
    if (res.drop) d += `\n🎁 Drop: ${N.nomeItem(res.drop)}`;
    if (res.subiu) d += `\n\n🎉 **Subiu para o nível ${j.nivel}!** Vida restaurada e +3 pontos de atributo.`;
    emb.setDescription(d);
  } else if (fim === 'derrota') {
    emb.setDescription(`💀 **Derrota...**\n${e.log.join('\n')}\n\nVocê perdeu ⭐ ${res.perda} stars e acordou com ${j.hp} HP.`);
  } else {
    emb.setDescription('🏃 Você fugiu do combate!');
  }
  return emb;
}

function botoes(userId, desativar = false) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`rpg:c:atq:${userId}`).setLabel('Atacar').setEmoji('🗡️').setStyle(ButtonStyle.Danger).setDisabled(desativar),
    new ButtonBuilder().setCustomId(`rpg:c:hab:${userId}`).setLabel('Habilidade').setEmoji('💥').setStyle(ButtonStyle.Primary).setDisabled(desativar),
    new ButtonBuilder().setCustomId(`rpg:c:poc:${userId}`).setLabel('Poção').setEmoji('🧪').setStyle(ButtonStyle.Success).setDisabled(desativar),
    new ButtonBuilder().setCustomId(`rpg:c:fug:${userId}`).setLabel('Fugir').setEmoji('🏃').setStyle(ButtonStyle.Secondary).setDisabled(desativar),
  )];
}

// Duelo: ambos com vida cheia, simulado automaticamente.
function simularDuelo(a, b) {
  const mk = (j) => ({ j, hp: j.hpMax, cd: 0 });
  const A = mk(a);
  const B = mk(b);
  const ordem = a.attr.agilidade >= b.attr.agilidade ? [A, B] : [B, A];
  let rounds = 0;

  const atacar = (x, y) => {
    const cl = CLASSES[x.j.classe];
    const opts = {};
    if (x.cd <= 0) {
      const h = cl.hab;
      opts.mult = h.mult;
      if (h.ignoraDef) opts.ignoraDef = true;
      if (h.tipo === 'critico') opts.critGarantido = true;
      if (h.tipo === 'cura') x.hp = Math.min(x.j.hpMax, x.hp + Math.round(x.j.hpMax * h.cura));
      x.cd = 3;
    } else {
      x.cd--;
    }
    if (Math.random() * 100 < N.esquiva(y.j)) return;
    y.hp -= golpe(N.ataque(x.j), N.critChance(x.j), N.defesa(y.j), opts).dano;
  };

  while (A.hp > 0 && B.hp > 0 && rounds < 40) {
    rounds++;
    atacar(ordem[0], ordem[1]);
    if (ordem[1].hp <= 0) break;
    atacar(ordem[1], ordem[0]);
  }
  const pa = Math.max(0, A.hp) / a.hpMax;
  const pb = Math.max(0, B.hp) / b.hpMax;
  return { vencedor: pa >= pb ? 'a' : 'b', rounds, hpA: Math.max(0, A.hp), hpB: Math.max(0, B.hp) };
}

module.exports = { iniciar, obterAtivo, agir, finalizar, embedCombate, embedFim, botoes, simularDuelo };
