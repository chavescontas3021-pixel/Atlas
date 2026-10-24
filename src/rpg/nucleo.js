// Núcleo do RPG: jogador, XP, atributos, inventário, cooldowns e perfil.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { CLASSES, ITENS } = require('./dados');

const COR = 0xf5a3c7;
const ATRIBUTOS = {
  forca: '💪 Força',
  agilidade: '💨 Agilidade',
  inteligencia: '🧠 Inteligência',
  sorte: '🍀 Sorte',
};

const caminho = (id) => `rpg.jogadores.${id}`;

function xpNecessario(n) { return 40 + n * n * 18; }
function hpMaxDe(j) { return CLASSES[j.classe].hp + (j.nivel - 1) * 12 + j.attr.forca * 3; }
function bonusArma(j) { return (j.equip.arma && ITENS[j.equip.arma] ? ITENS[j.equip.arma].bonus : 0); }
function bonusArmadura(j) { return (j.equip.armadura && ITENS[j.equip.armadura] ? ITENS[j.equip.armadura].bonus : 0); }
function ataque(j) { return j.attr[CLASSES[j.classe].principal] * 2 + j.nivel * 2 + bonusArma(j); }
function defesa(j) { return j.attr.agilidade + j.nivel + Math.floor(j.attr.forca / 2) + bonusArmadura(j); }
function critChance(j) { return 5 + j.attr.sorte * 1.5; }
function esquiva(j) { return Math.min(30, j.attr.agilidade * 1.2); }

function regenerar(j) {
  const agora = Date.now();
  const ganho = Math.floor(((agora - (j.regenEm || agora)) / 60000) * j.hpMax * 0.02);
  if (ganho >= 1) {
    j.hp = Math.min(j.hpMax, j.hp + ganho);
    j.regenEm = agora;
  }
  if (j.hp >= j.hpMax) j.regenEm = agora;
}

function obter(id) {
  const j = db.get(caminho(id), null);
  if (!j) return null;
  regenerar(j);
  return j;
}

function salvar(id, j) { db.set(caminho(id), j); }

function todos() { return db.get('rpg.jogadores', {}); }

function criar(id, classe, personagem) {
  const c = CLASSES[classe];
  const j = {
    classe,
    personagem: personagem || null,
    nivel: 1,
    xp: 0,
    moedas: 100,
    attr: { ...c.base },
    pontos: 0,
    inv: { pocao_p: 3 },
    equip: { arma: null, armadura: null },
    cd: {},
    vitorias: 0,
    derrotas: 0,
    streak: 0,
    criadoEm: Date.now(),
    regenEm: Date.now(),
  };
  j.hpMax = hpMaxDe(j);
  j.hp = j.hpMax;
  salvar(id, j);
  return j;
}

function ganharXp(j, qtd) {
  j.xp += qtd;
  let subiu = 0;
  while (j.xp >= xpNecessario(j.nivel)) {
    j.xp -= xpNecessario(j.nivel);
    j.nivel++;
    subiu++;
    j.pontos += 3;
    j.attr[CLASSES[j.classe].principal]++;
  }
  if (subiu) {
    j.hpMax = hpMaxDe(j);
    j.hp = j.hpMax;
  }
  return subiu;
}

function addItem(j, id, q = 1) { j.inv[id] = (j.inv[id] || 0) + q; }
function removerItem(j, id, q = 1) {
  j.inv[id] = (j.inv[id] || 0) - q;
  if (j.inv[id] <= 0) delete j.inv[id];
}

function restante(j, k) { return Math.max(0, (j.cd[k] || 0) - Date.now()); }
function definirCd(j, k, ms) { j.cd[k] = Date.now() + ms; }

function fmt(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

function barra(atual, max, tam = 10) {
  const cheio = Math.max(0, Math.min(tam, Math.round((atual / max) * tam)));
  return '█'.repeat(cheio) + '░'.repeat(tam - cheio);
}

function nomeItem(id) {
  const i = ITENS[id];
  return i ? `${i.emoji} ${i.nome}` : id;
}

function embedPerfil(j, usuario) {
  const c = CLASSES[j.classe];
  const nec = xpNecessario(j.nivel);
  const attrs = Object.entries(ATRIBUTOS).map(([k, n]) => `${n}: **${j.attr[k]}**`).join('\n');
  const total = j.vitorias + j.derrotas;
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${c.emoji} ${j.personagem || usuario.username}`)
    .setDescription(`**${c.nome}** · Nível **${j.nivel}**${j.pontos ? `\n🎯 Você tem **${j.pontos}** ponto(s) para distribuir (\`/rpg atributo\`).` : ''}`)
    .setThumbnail(usuario.displayAvatarURL())
    .addFields(
      { name: '❤️ Vida', value: `${barra(j.hp, j.hpMax)} ${j.hp}/${j.hpMax}`, inline: false },
      { name: '⭐ XP', value: `${barra(j.xp, nec)} ${j.xp}/${nec}`, inline: false },
      { name: '📊 Atributos', value: attrs, inline: true },
      {
        name: '🎒 Equipamento',
        value: `Arma: ${j.equip.arma ? nomeItem(j.equip.arma) : '—'}\nArmadura: ${j.equip.armadura ? nomeItem(j.equip.armadura) : '—'}\n⚔️ Ataque: **${ataque(j)}** · 🛡️ Defesa: **${defesa(j)}**`,
        inline: true,
      },
      { name: '💰 Moedas', value: `${j.moedas}`, inline: true },
      { name: '🏆 Combates', value: `${j.vitorias} vitórias · ${j.derrotas} derrotas${total ? ` (${Math.round((j.vitorias / total) * 100)}%)` : ''}`, inline: true },
    );
}

module.exports = {
  COR, ATRIBUTOS, xpNecessario, hpMaxDe, bonusArma, bonusArmadura, ataque, defesa, critChance, esquiva,
  obter, salvar, todos, criar, ganharXp, addItem, removerItem, restante, definirCd, fmt, barra, nomeItem, embedPerfil,
};
