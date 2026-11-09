// Masmorras: 4 dificuldades, cada uma com seus andares, 5 monstros por andar e um Boss no fim.
const { MONSTROS } = require('./dados');

const BICHOS_POR_ANDAR = 5;
const CURA_VITORIA = 0.08; // vida recuperada a cada bicho derrotado
const CURA_DESCANSO = 0.35; // vida recuperada ao descansar (uma vez por andar)

// Cada bicho da masmorra tem nome, emoji e desenho próprios, mas usa os números (vida, ataque...) de um monstro comum
// de mesmo nível. Assim o equilíbrio testado continua valendo.
const e = (nome, emoji, base) => ({ nome, emoji, base });

const MASMORRAS = {
  iniciante: {
    nome: 'Catacumbas Esquecidas', emoji: '🕯️', dificuldade: 'Iniciante', andares: 5,
    nivelMin: 4, recomendado: 'Nv 6+', cdHoras: 3,
    desc: 'Corredores úmidos cheios de bichos famintos.',
    pool: [e('Rato das Catacumbas', '🐀', 'Slime Verde'), e('Morcego Sombrio', '🦇', 'Lobo Selvagem'), e('Zumbi Podre', '🧟', 'Goblin Saqueador'), e('Esqueleto da Cripta', '💀', 'Esqueleto Guerreiro'), e('Orc Carcereiro', '👹', 'Orc Brutamontes')],
    boss: { nome: 'Lobo Infernal', emoji: '🔥', xp: 2000, moedas: [500, 800], drop: 'pele_lobo', dropQtd: 6, raro: null },
    hp: 1.0, atk: 1.0, def: 1.05, bossHp: 2.5, bossAtk: 1.1,
  },
  intermediario: {
    nome: 'Ninho da Aranha', emoji: '🕸️', dificuldade: 'Intermediário', andares: 10,
    nivelMin: 12, recomendado: 'Nv 15+', cdHoras: 6,
    desc: 'Túneis cobertos de teias onde nada volta.',
    pool: [e('Aranha Tecelã', '🕷️', 'Goblin Saqueador'), e('Escorpião das Sombras', '🦂', 'Esqueleto Guerreiro'), e('Aranha Caçadora', '🕸️', 'Orc Brutamontes'), e('Golem de Teia', '🗿', 'Golem de Pedra'), e('Viúva Sombria', '🕷️', 'Dragão Jovem')],
    boss: { nome: 'Aranha Gigante', emoji: '🕷️', xp: 9000, moedas: [2000, 3000], drop: 'nucleo_golem', dropQtd: 6, raro: 'elixir_sombrio' },
    hp: 0.85, atk: 1.0, def: 1.05, bossHp: 1.9, bossAtk: 1.05,
  },
  avancado: {
    nome: 'Fortaleza do Rei Caído', emoji: '🏰', dificuldade: 'Avançado', andares: 15,
    nivelMin: 22, recomendado: 'Nv 28+', cdHoras: 12,
    desc: 'Salões antigos vigiados por soldados que não descansam.',
    pool: [e('Soldado Caído', '🪖', 'Orc Brutamontes'), e('Armadura Assombrada', '🛡️', 'Golem de Pedra'), e('Arqueiro Esquelético', '🏹', 'Dragão Jovem'), e('Lich Cortesão', '☠️', 'Lich Ancião'), e('Cavaleiro Real Maldito', '🥷', 'Cavaleiro das Trevas')],
    boss: { nome: 'Rei Esqueleto', emoji: '👑', xp: 33000, moedas: [6000, 9000], drop: 'essencia_lich', dropQtd: 5, raro: 'elixir_vital' },
    hp: 0.85, atk: 0.85, def: 1.05, bossHp: 1.4, bossAtk: 1.05,
  },
  mestre: {
    nome: 'Covil do Dragão Negro', emoji: '🐉', dificuldade: 'Mestre', andares: 20,
    nivelMin: 34, recomendado: 'Nv 40+', cdHoras: 24,
    desc: 'O fim do mundo. Poucos descem tão fundo.',
    pool: [e('Dragonete de Brasa', '🐲', 'Dragão Jovem'), e('Cultista do Dragão', '🔥', 'Lich Ancião'), e('Guardião Draconiano', '🦎', 'Cavaleiro das Trevas'), e('Hidra das Brasas', '🐍', 'Hidra Abissal'), e('Espectro de Cinzas', '👻', 'Devorador de Almas')],
    boss: { nome: 'Dragão Negro', emoji: '🖤', xp: 100000, moedas: [20000, 28000], drop: 'fragmento_vazio', dropQtd: 4, raro: 'elixir_vital' },
    hp: 0.65, atk: 0.6, def: 1.05, bossHp: 1.6, bossAtk: 0.95,
  },
};

const ORDEM = ['iniciante', 'intermediario', 'avancado', 'mestre'];
const rolar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const base = (nome) => MONSTROS.find((m) => m.nome === nome);

// Cada andar fica um pouco mais forte que o anterior, além de trocar os monstros por outros mais perigosos
const escalaAndar = (andar) => 1 + (andar - 1) * 0.035;

function aplicar(m, mult, nome, emoji) {
  return {
    ...m,
    nome: nome || m.nome,
    emoji: emoji || m.emoji,
    hp: Math.round(m.hp * mult.hp),
    hpMax: Math.round(m.hp * mult.hp),
    atk: Math.round(m.atk * mult.atk),
    def: Math.round(m.def * mult.def),
  };
}

// Um dos 5 bichos de um andar
function gerarBicho(dif, andar) {
  const d = MASMORRAS[dif];
  const p = d.andares > 1 ? (andar - 1) / (d.andares - 1) : 0;
  const centro = p * (d.pool.length - 1);
  const idx = Math.max(0, Math.min(d.pool.length - 1, Math.round(centro + rolar(-1, 1) * 0.8)));
  const slot = d.pool[idx];
  const m = base(slot.base);
  const esc = escalaAndar(andar);
  return aplicar(m, { hp: d.hp * esc, atk: d.atk * esc, def: d.def * esc }, slot.nome, slot.emoji);
}

// O Boss do fim da masmorra: o monstro mais forte do grupo, muito mais resistente
function gerarBoss(dif) {
  const d = MASMORRAS[dif];
  const topo = base(d.pool[d.pool.length - 1].base);
  const esc = escalaAndar(d.andares);
  const m = aplicar(topo, { hp: d.bossHp * d.hp * esc, atk: d.bossAtk * d.atk * esc, def: 1.15 * d.def * esc }, d.boss.nome, d.boss.emoji);
  return { ...m, boss: true, xp: d.boss.xp, moedas: d.boss.moedas, drop: { item: d.boss.drop, chance: 1 }, nivel: topo.nivel + 4 };
}

module.exports = { BICHOS_POR_ANDAR, CURA_VITORIA, CURA_DESCANSO, MASMORRAS, ORDEM, gerarBicho, gerarBoss, escalaAndar };
