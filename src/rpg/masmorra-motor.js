// Motor de combate das masmorras (turnos). Parecido com o combate normal, mas com:
// poção inteligente (usa também os elixires) e golpe poderoso do Boss avisado um turno antes.
const { CLASSES, ITENS } = require('./dados');
const N = require('./nucleo');

const CONSUMOS = ['pocao_p', 'pocao_m', 'pocao_g', 'elixir_sombrio', 'elixir_vital'];
const VISUAL = { guerreiro: 'cruz', mago: 'explosao', arqueiro: 'flechas', curandeiro: 'luz', ladino: 'furtivo' };
const rolar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function golpe(atk, critChance, defesa, { mult = 1, critGarantido = false, ignoraDef = false } = {}) {
  const base = atk + rolar(0, 4);
  const crit = critGarantido || Math.random() * 100 < critChance;
  const red = ignoraDef ? 0 : Math.floor(defesa / 2);
  const dano = Math.max(1, Math.round(base * mult * (crit ? 1.6 : 1)) - red);
  return { dano, crit };
}

// Escolhe a melhor poção: a menor que cobre a vida que falta; se nenhuma cobre, a maior que a pessoa tiver
function melhorPocao(j) {
  const falta = j.hpMax - j.hp;
  const tem = CONSUMOS.filter((i) => (j.inv[i] || 0) > 0 && ITENS[i]).sort((a, b) => ITENS[a].cura - ITENS[b].cura);
  if (!tem.length) return null;
  return tem.find((i) => ITENS[i].cura >= falta) || tem[tem.length - 1];
}
const totalPocoes = (j) => CONSUMOS.reduce((s, i) => s + (j.inv[i] || 0), 0);

function novoCombate(userId, monstro, j) {
  return {
    userId, monstro, cdHab: 0, turno: 0, carga: false, log: [], eventos: [], inicio: Date.now(),
    hpIni: { a: j.hp, b: monstro.hp },
  };
}

function usarPocao(j) {
  const id = melhorPocao(j);
  if (!id) return { invalido: 'Você não tem poções nem elixires.' };
  if (j.hp >= j.hpMax) return { invalido: 'Sua vida já está cheia.' };
  N.removerItem(j, id, 1);
  const cura = Math.min(ITENS[id].cura, j.hpMax - j.hp);
  j.hp += cura;
  return { id, cura };
}

// Uma rodada: ação do jogador + resposta do monstro. Devolve { fim?: 'vitoria'|'derrota'|'fuga', invalido? }
function agir(e, j, tipo) {
  const cl = CLASSES[j.classe];
  const m = e.monstro;
  const linhas = [];
  e.eventos = [];
  e.hpIni = { a: j.hp, b: m.hp };
  const reg = (ev) => e.eventos.push({ hpA: Math.max(0, j.hp), hpB: Math.max(0, m.hp), ...ev });

  if (tipo === 'hab' && e.cdHab > 0) return { invalido: `Sua habilidade está em recarga (${e.cdHab} turno(s)).` };

  if (tipo === 'poc') {
    const r = usarPocao(j);
    if (r.invalido) return r;
    linhas.push(`🧪 Você usou **${ITENS[r.id].nome}** e recuperou **${r.cura}** HP.`);
    reg({ por: 'a', tipo: 'poc', cura: r.cura });
  } else if (tipo === 'fug') {
    if (m.boss) {
      linhas.push('🚫 Não dá para fugir do Boss!');
    } else {
      const chance = Math.min(85, 45 + j.attr.agilidade * 2);
      if (Math.random() * 100 < chance) {
        e.log = ['🏃 Você escapou e voltou para o acampamento!'];
        return { fim: 'fuga' };
      }
      linhas.push('🏃 Você tentou fugir, mas falhou!');
    }
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
    let curou = 0;
    if (cura) {
      const c = Math.min(cura, j.hpMax - j.hp);
      j.hp += c;
      curou = c;
      linhas.push(`✨ Você recuperou **${c}** HP.`);
    }
    reg({ por: 'a', tipo: tipo === 'hab' ? 'hab' : 'atq', visual: tipo === 'hab' ? (VISUAL[j.classe] || 'cruz') : 'corte', dano: r.dano, crit: r.crit, cura: curou });
  }

  if (m.hp <= 0) {
    m.hp = 0;
    e.log = linhas;
    return { fim: 'vitoria' };
  }

  // Turno do monstro
  e.turno++;
  const forte = m.boss && e.carga;
  if (forte) e.carga = false;
  if (Math.random() * 100 < N.esquiva(j)) {
    linhas.push(`💨 Você desviou do ataque de ${m.nome}!`);
    reg({ por: 'b', tipo: 'atq', visual: 'corte', esq: true, forte });
  } else {
    const r = golpe(Math.round((m.atk * rolar(80, 120)) / 100), 5, N.defesa(j), { mult: forte ? 1.7 : 1 });
    j.hp -= r.dano;
    linhas.push(`${m.emoji} ${m.nome} ${forte ? 'desferiu um **GOLPE DEVASTADOR**' : 'causou'} **${r.dano}** de dano${r.crit ? ' (**CRÍTICO!**)' : ''}.`);
    reg({ por: 'b', tipo: 'atq', visual: 'corte', dano: r.dano, crit: r.crit, forte });
  }
  // O Boss avisa um turno antes do golpe forte (a cada 4 turnos)
  if (m.boss && e.turno % 4 === 3 && m.hp > 0 && j.hp > 0) {
    e.carga = true;
    const ultimo = e.eventos[e.eventos.length - 1];
    if (ultimo) ultimo.aviso = true; // a cena mostra o Boss se preparando
    linhas.push(`⚠️ **${m.nome} ruge e prepara um golpe devastador!**`);
  }
  if (e.cdHab > 0) e.cdHab--;

  e.log = linhas;
  if (j.hp <= 0) {
    j.hp = 0;
    return { fim: 'derrota' };
  }
  return {};
}

module.exports = { agir, novoCombate, usarPocao, melhorPocao, totalPocoes, golpe, rolar, CONSUMOS };
