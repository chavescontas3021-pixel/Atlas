// Masmorras: andares com 5 bichos e um Boss no fim. O progresso fica salvo (db), então dá para
// retomar com /masmorra continuar. O saque (XP, stars e itens) só é pago ao sair, vencer o Boss ou morrer.
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { CLASSES, ITENS } = require('./dados');
const N = require('./nucleo');
const C = require('./combate');
const B = require('../personagem/batalha');
const Mot = require('./masmorra-motor');
const D = require('./masmorra-dados');

const { MASMORRAS, BICHOS_POR_ANDAR: POR_ANDAR, CURA_VITORIA, CURA_DESCANSO } = D;
const FRACAO_MORTE = 0.3; // morrendo você leva 30% do saque
const CD_MORTE = 15 * 60 * 1000;
const CD_SAIDA = 5 * 60 * 1000;

const chave = (uid) => `rpg.masmorra.${uid}`;
const estado = (uid) => db.get(chave(uid), null);
const salvarEstado = (uid, st) => db.set(chave(uid), st);
const apagarEstado = (uid) => db.remover(chave(uid));
const cdChave = (dif) => `masm_${dif}`;
const rolar = Mot.rolar;

const registro = (j, dif) => {
  j.masm = j.masm || {};
  j.masm[dif] = j.masm[dif] || { concluidas: 0, melhor: 0 };
  return j.masm[dif];
};

// ---------- Regras ----------
function validarEntrada(j, dif) {
  const d = MASMORRAS[dif];
  if (!d) return 'Essa masmorra não existe.';
  if (j.nivel < d.nivelMin) return `Você precisa do nível **${d.nivelMin}** para entrar em ${d.nome}.`;
  const falta = N.restante(j, cdChave(dif));
  if (falta) return `⏳ ${d.nome} está selada por mais **${N.fmt(falta)}**.`;
  if (j.hp < j.hpMax * 0.5) return `Você está muito ferido (${j.hp}/${j.hpMax}). Recupere pelo menos metade da vida antes de entrar (poções ou descanso).`;
  return null;
}

function entrar(uid, j, dif) {
  const st = {
    dif, andar: 1, abatidos: 0, fase: 'acampamento', e: null, descansou: false,
    loot: { xp: 0, moedas: 0, itens: {} }, inicio: Date.now(), ultimo: null,
  };
  registro(j, dif).melhor = Math.max(registro(j, dif).melhor, 1);
  salvarEstado(uid, st);
  N.salvar(uid, j);
  return st;
}

// Começa a próxima luta: um bicho do andar, ou o Boss quando os 5 bichos do último andar caíram
function proximo(uid, j, st) {
  const d = MASMORRAS[st.dif];
  let boss = false;
  if (st.abatidos >= POR_ANDAR) {
    if (st.andar >= d.andares) boss = true;
    else {
      st.andar++;
      st.abatidos = 0;
      st.descansou = false;
      const r = registro(j, st.dif);
      r.melhor = Math.max(r.melhor, st.andar);
    }
  }
  const monstro = boss ? D.gerarBoss(st.dif) : D.gerarBicho(st.dif, st.andar);
  st.e = Mot.novoCombate(uid, monstro, j);
  st.fase = 'combate';
  st.ultimo = null;
  salvarEstado(uid, st);
  N.salvar(uid, j);
  return st.e;
}

const chefeNoFim = (st) => st.abatidos >= POR_ANDAR && st.andar >= MASMORRAS[st.dif].andares;

// Paga o saque (fator 1 = tudo, 0.3 = só 30%)
function pagar(j, loot, fator) {
  const xp = Math.floor(loot.xp * fator);
  const moedas = Math.floor(loot.moedas * fator);
  const itens = {};
  for (const [id, q] of Object.entries(loot.itens)) {
    const n = fator >= 1 ? q : Math.floor(q * fator);
    if (n > 0) { itens[id] = n; N.addItem(j, id, n); }
  }
  j.moedas += moedas;
  const subiu = N.ganharXp(j, xp);
  return { xp, moedas, itens, subiu };
}

// Vitória num combate: soma o saque. Se era o Boss, a masmorra termina.
function vitoria(uid, j, st) {
  const e = st.e;
  const m = e.monstro;
  const d = MASMORRAS[st.dif];
  st.ultimo = e.log;
  j.hp = Math.min(j.hpMax, j.hp + Math.round(j.hpMax * CURA_VITORIA));

  if (m.boss) {
    const loot = { xp: st.loot.xp + d.boss.xp, moedas: st.loot.moedas + rolar(d.boss.moedas[0], d.boss.moedas[1]), itens: { ...st.loot.itens } };
    loot.itens[d.boss.drop] = (loot.itens[d.boss.drop] || 0) + d.boss.dropQtd;
    if (d.boss.raro) loot.itens[d.boss.raro] = (loot.itens[d.boss.raro] || 0) + 1 + (Math.random() < 0.35 ? 1 : 0);
    const res = pagar(j, loot, 1);
    const r = registro(j, st.dif);
    r.concluidas++;
    r.melhor = d.andares;
    j.vitorias++;
    N.definirCd(j, cdChave(st.dif), d.cdHoras * 3600 * 1000);
    apagarEstado(uid);
    N.salvar(uid, j);
    return { fim: 'concluida', res, ganho: { xp: d.boss.xp } };
  }

  const xp = m.xp;
  const moedas = Math.round(rolar(m.moedas[0], m.moedas[1]) * (1 + j.attr.sorte * 0.01));
  let drop = null;
  if (Math.random() < m.drop.chance + j.attr.sorte * 0.005) {
    st.loot.itens[m.drop.item] = (st.loot.itens[m.drop.item] || 0) + 1;
    drop = m.drop.item;
  }
  st.loot.xp += xp;
  st.loot.moedas += moedas;
  st.abatidos++;
  st.fase = 'acampamento';
  st.e = null;
  st.ganho = { xp, moedas, drop };
  salvarEstado(uid, st);
  N.salvar(uid, j);
  return { fim: 'bicho', ganho: st.ganho };
}

function derrota(uid, j, st) {
  const res = pagar(j, st.loot, FRACAO_MORTE);
  j.derrotas++;
  j.hp = Math.max(1, Math.ceil(j.hpMax * 0.3));
  N.definirCd(j, cdChave(st.dif), CD_MORTE);
  apagarEstado(uid);
  N.salvar(uid, j);
  return res;
}

function sair(uid, j, st) {
  const res = pagar(j, st.loot, 1);
  N.definirCd(j, cdChave(st.dif), CD_SAIDA);
  apagarEstado(uid);
  N.salvar(uid, j);
  return res;
}

function descansar(uid, j, st) {
  if (st.descansou) return { invalido: 'Você já descansou neste andar.' };
  if (j.hp >= j.hpMax) return { invalido: 'Sua vida já está cheia.' };
  const cura = Math.min(Math.round(j.hpMax * CURA_DESCANSO), j.hpMax - j.hp);
  j.hp += cura;
  st.descansou = true;
  salvarEstado(uid, st);
  N.salvar(uid, j);
  return { cura };
}

// ---------- Telas ----------
const itensTxt = (itens) => {
  const l = Object.entries(itens).map(([id, q]) => `${N.nomeItem(id)} ×${q}`);
  return l.length ? l.join(', ') : '—';
};
const quadradinhos = (feitos, total) => '🟩'.repeat(feitos) + '⬜'.repeat(total - feitos);

function lootTxt(l) {
  return `✨ ${l.xp} XP · ⭐ ${l.moedas} stars\n🎁 ${itensTxt(l.itens)}`;
}

function embedAcampamento(st, j, comImagem) {
  const d = MASMORRAS[st.dif];
  const boss = chefeNoFim(st);
  const cl = CLASSES[j.classe];
  let desc = '';
  if (st.ultimo) desc += `${st.ultimo.join('\n')}\n`;
  if (st.ganho) desc += `🏆 +${st.ganho.xp} XP · ⭐ +${st.ganho.moedas} stars${st.ganho.drop ? ` · 🎁 ${N.nomeItem(st.ganho.drop)}` : ''} *(no saque)*\n`;
  desc += `\n${boss ? `👑 **Os 5 bichos do último andar caíram. O Boss ${d.boss.nome} te espera!**` : `Bichos do andar: ${quadradinhos(st.abatidos, POR_ANDAR)} **${st.abatidos}/${POR_ANDAR}**`}`;
  const pocoes = Mot.totalPocoes(j);
  const emb = new EmbedBuilder()
    .setColor(N.COR)
    .setTitle(`${d.emoji} ${d.nome} · Andar ${st.andar}/${d.andares}`)
    .setDescription(desc)
    .addFields(
      { name: `${cl.emoji} ${j.personagem || 'Você'}`, value: `${N.barra(j.hp, j.hpMax)} ${j.hp}/${j.hpMax}\n🧪 ${pocoes} poção(ões)/elixir(es)`, inline: false },
      { name: '🎒 Saque (pago ao sair ou vencer)', value: lootTxt(st.loot), inline: false },
    )
    .setFooter({ text: `${d.dificuldade} · Descansar cura ${Math.round(CURA_DESCANSO * 100)}% (1x por andar) · Morrer = perde 70% do saque` });
  if (comImagem) emb.setImage(`attachment://${B.ARQUIVO}`);
  return emb;
}

function embedCombate(st, e, j) {
  const d = MASMORRAS[st.dif];
  const m = e.monstro;
  const cl = CLASSES[j.classe];
  const local = m.boss ? 'Boss' : `Bicho ${st.abatidos + 1}/${POR_ANDAR}`;
  return new EmbedBuilder()
    .setColor(m.boss ? 0xe74c3c : N.COR)
    .setTitle(m.boss ? `👑 BOSS: ${m.nome}` : `${m.emoji} ${m.nome} (Nv ${m.nivel})`)
    .setDescription(`${d.emoji} ${d.nome} · Andar ${st.andar}/${d.andares} · ${local}`)
    .addFields(
      { name: `${m.emoji} ${m.boss ? 'Boss' : 'Monstro'}`, value: `${N.barra(m.hp, m.hpMax)} ${m.hp}/${m.hpMax}`, inline: false },
      { name: `${cl.emoji} ${j.personagem || 'Você'}`, value: `${N.barra(j.hp, j.hpMax)} ${j.hp}/${j.hpMax}`, inline: false },
      { name: 'Último turno', value: e.log.join('\n').slice(0, 1000) || '⚔️ A luta começou!', inline: false },
    )
    .setImage(`attachment://${B.ARQUIVO}`)
    .setFooter({ text: e.cdHab > 0 ? `${cl.hab.nome}: recarga ${e.cdHab} turno(s)` : `${cl.hab.nome}: pronta! · ${cl.hab.desc}` });
}

function embedFinal(tipo, st, j, res, extra = {}) {
  const d = MASMORRAS[st.dif];
  const emb = new EmbedBuilder().setColor(tipo === 'concluida' ? 0xf1c40f : N.COR).setTitle(`${d.emoji} ${d.nome}`);
  const loot = `✨ **+${res.xp} XP** · ⭐ **+${res.moedas} stars**\n🎁 ${itensTxt(res.itens)}`;
  const nivel = res.subiu ? `\n\n🎉 **Subiu para o nível ${j.nivel}!** Vida restaurada e +3 pontos de atributo.` : '';
  if (tipo === 'concluida') {
    emb.setDescription(`🏆 **${d.nome} CONCLUÍDA!** O Boss **${d.boss.nome}** foi derrotado!\n${(extra.log || []).join('\n')}\n\n${loot}${nivel}\n\n⏳ A masmorra se sela por ${d.cdHoras}h.`);
    emb.setImage(`attachment://${B.ARQUIVO}`);
  } else if (tipo === 'derrota') {
    emb.setDescription(`💀 **Você caiu no andar ${st.andar}...**\n${(extra.log || []).join('\n')}\n\nVocê levou só 30% do saque:\n${loot}${nivel}\n\n🩹 Acordou com ${j.hp} HP. A masmorra fica selada por 15 min.`);
    emb.setImage(`attachment://${B.ARQUIVO}`);
  } else {
    emb.setDescription(`🚪 **Você deixou a masmorra no andar ${st.andar}.**\n\n${loot}${nivel}`);
  }
  return emb;
}

function botoesAcampamento(uid, st, j) {
  const boss = chefeNoFim(st);
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`masm:avancar:${uid}`).setLabel(boss ? 'Enfrentar o Boss' : st.abatidos >= POR_ANDAR ? 'Descer ao próximo andar' : 'Avançar').setEmoji(boss ? '👑' : '⚔️').setStyle(boss ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`masm:desc:${uid}`).setLabel('Descansar').setEmoji('🏕️').setStyle(ButtonStyle.Primary).setDisabled(st.descansou || j.hp >= j.hpMax),
    new ButtonBuilder().setCustomId(`masm:pocao:${uid}`).setLabel('Poção').setEmoji('🧪').setStyle(ButtonStyle.Secondary).setDisabled(j.hp >= j.hpMax || Mot.totalPocoes(j) === 0),
    new ButtonBuilder().setCustomId(`masm:sair:${uid}`).setLabel('Sair').setEmoji('🚪').setStyle(ButtonStyle.Secondary),
  )];
}

function botoesConfirmarSaida(uid) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`masm:sair2:${uid}`).setLabel('Sim, sair (leva o saque)').setEmoji('🚪').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`masm:voltar:${uid}`).setLabel('Voltar').setStyle(ButtonStyle.Secondary),
  )];
}

function botoesCombate(uid, e) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`masm:atq:${uid}`).setLabel('Atacar').setEmoji('🗡️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`masm:hab:${uid}`).setLabel('Habilidade').setEmoji('💥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`masm:poc:${uid}`).setLabel('Poção').setEmoji('🧪').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`masm:fug:${uid}`).setLabel('Fugir').setEmoji('🏃').setStyle(ButtonStyle.Secondary).setDisabled(!!(e && e.monstro.boss)),
  )];
}

// Painel atual (acampamento ou combate) pronto para enviar
function painel(uid, st, j) {
  if (st.fase === 'combate' && st.e) {
    return { embeds: [embedCombate(st, st.e, j)], components: botoesCombate(uid, st.e), files: C.arquivos(st.e, j), attachments: [] };
  }
  return { embeds: [embedAcampamento(st, j, false)], components: botoesAcampamento(uid, st, j), files: [], attachments: [] };
}

module.exports = {
  estado, salvarEstado, validarEntrada, entrar, proximo, vitoria, derrota, sair, descansar, pagar, chefeNoFim,
  embedAcampamento, embedCombate, embedFinal, botoesAcampamento, botoesConfirmarSaida, botoesCombate, painel,
  registro, cdChave, itensTxt, POR_ANDAR,
};
