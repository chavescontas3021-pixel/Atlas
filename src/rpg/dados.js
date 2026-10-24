// Dados do RPG: classes, itens e monstros.

const CLASSES = {
  guerreiro: {
    nome: 'Guerreiro', emoji: '⚔️', principal: 'forca', hp: 120,
    desc: 'Resistente e brutal. Muita vida e golpes pesados.',
    base: { forca: 6, agilidade: 3, inteligencia: 1, sorte: 2 },
    hab: { nome: 'Golpe Brutal', tipo: 'dano', mult: 1.9, desc: 'Dano de 190%.' },
  },
  mago: {
    nome: 'Mago', emoji: '🔮', principal: 'inteligencia', hp: 85,
    desc: 'Frágil, mas com o maior dano mágico.',
    base: { forca: 1, agilidade: 3, inteligencia: 7, sorte: 2 },
    hab: { nome: 'Bola de Fogo', tipo: 'dano', mult: 2.3, desc: 'Dano de 230%.' },
  },
  arqueiro: {
    nome: 'Arqueiro', emoji: '🏹', principal: 'agilidade', hp: 95,
    desc: 'Rápido, desvia bastante e ignora defesa.',
    base: { forca: 2, agilidade: 6, inteligencia: 2, sorte: 3 },
    hab: { nome: 'Chuva de Flechas', tipo: 'dano', mult: 1.7, ignoraDef: true, desc: 'Dano de 170% que ignora a defesa.' },
  },
  curandeiro: {
    nome: 'Curandeiro', emoji: '✨', principal: 'inteligencia', hp: 100,
    desc: 'Sobrevive muito: ataca e se cura.',
    base: { forca: 2, agilidade: 2, inteligencia: 6, sorte: 3 },
    hab: { nome: 'Luz Sagrada', tipo: 'cura', mult: 1.0, cura: 0.3, desc: 'Ataca e recupera 30% da vida máxima.' },
  },
  ladino: {
    nome: 'Ladino', emoji: '🗡️', principal: 'agilidade', hp: 90,
    desc: 'Sortudo e letal: acerta críticos.',
    base: { forca: 2, agilidade: 6, inteligencia: 2, sorte: 4 },
    hab: { nome: 'Golpe Furtivo', tipo: 'critico', mult: 1.5, desc: 'Crítico garantido com 150% de dano.' },
  },
};

const ITENS = {
  pocao_p: { nome: 'Poção Pequena', emoji: '🧪', tipo: 'consumo', cura: 40, preco: 30 },
  pocao_m: { nome: 'Poção Média', emoji: '🧪', tipo: 'consumo', cura: 100, preco: 80 },
  pocao_g: { nome: 'Poção Grande', emoji: '🧪', tipo: 'consumo', cura: 250, preco: 180 },

  lamina_ferro: { nome: 'Lâmina de Ferro', emoji: '🗡️', tipo: 'arma', bonus: 4, preco: 120, nivelMin: 2 },
  lamina_aco: { nome: 'Lâmina de Aço', emoji: '🗡️', tipo: 'arma', bonus: 9, preco: 350, nivelMin: 6 },
  lamina_runica: { nome: 'Lâmina Rúnica', emoji: '🗡️', tipo: 'arma', bonus: 16, preco: 900, nivelMin: 12 },
  lamina_estelar: { nome: 'Lâmina Estelar', emoji: '🗡️', tipo: 'arma', bonus: 26, preco: 2400, nivelMin: 20 },

  couro: { nome: 'Couro Curtido', emoji: '🛡️', tipo: 'armadura', bonus: 3, preco: 100, nivelMin: 2 },
  malha: { nome: 'Cota de Malha', emoji: '🛡️', tipo: 'armadura', bonus: 7, preco: 320, nivelMin: 6 },
  placas: { nome: 'Armadura de Placas', emoji: '🛡️', tipo: 'armadura', bonus: 13, preco: 850, nivelMin: 12 },
  manto_estelar: { nome: 'Manto Estelar', emoji: '🛡️', tipo: 'armadura', bonus: 22, preco: 2200, nivelMin: 20 },

  gosma: { nome: 'Gosma', emoji: '🟢', tipo: 'material', preco: 6 },
  pele_lobo: { nome: 'Pele de Lobo', emoji: '🐺', tipo: 'material', preco: 14 },
  dente_goblin: { nome: 'Dente de Goblin', emoji: '🦷', tipo: 'material', preco: 22 },
  osso: { nome: 'Osso Antigo', emoji: '🦴', tipo: 'material', preco: 30 },
  presa_orc: { nome: 'Presa de Orc', emoji: '🐗', tipo: 'material', preco: 50 },
  nucleo_golem: { nome: 'Núcleo de Golem', emoji: '💠', tipo: 'material', preco: 80 },
  escama: { nome: 'Escama de Dragão', emoji: '🐉', tipo: 'material', preco: 140 },
  essencia_lich: { nome: 'Essência de Lich', emoji: '💀', tipo: 'material', preco: 260 },
};

const LOJA = [
  'pocao_p', 'pocao_m', 'pocao_g',
  'lamina_ferro', 'lamina_aco', 'lamina_runica', 'lamina_estelar',
  'couro', 'malha', 'placas', 'manto_estelar',
];

const MONSTROS = [
  { nome: 'Slime Verde', emoji: '🟢', nivel: 1, hp: 30, atk: 6, def: 1, xp: 12, moedas: [8, 16], drop: { item: 'gosma', chance: 0.4 } },
  { nome: 'Lobo Selvagem', emoji: '🐺', nivel: 3, hp: 60, atk: 11, def: 3, xp: 26, moedas: [14, 28], drop: { item: 'pele_lobo', chance: 0.4 } },
  { nome: 'Goblin Saqueador', emoji: '👺', nivel: 5, hp: 90, atk: 16, def: 5, xp: 40, moedas: [24, 44], drop: { item: 'dente_goblin', chance: 0.4 } },
  { nome: 'Esqueleto Guerreiro', emoji: '💀', nivel: 8, hp: 140, atk: 23, def: 8, xp: 62, moedas: [40, 70], drop: { item: 'osso', chance: 0.4 } },
  { nome: 'Orc Brutamontes', emoji: '👹', nivel: 12, hp: 220, atk: 34, def: 13, xp: 100, moedas: [70, 120], drop: { item: 'presa_orc', chance: 0.4 } },
  { nome: 'Golem de Pedra', emoji: '🗿', nivel: 16, hp: 340, atk: 46, def: 22, xp: 150, moedas: [110, 190], drop: { item: 'nucleo_golem', chance: 0.4 } },
  { nome: 'Dragão Jovem', emoji: '🐲', nivel: 22, hp: 520, atk: 64, def: 30, xp: 240, moedas: [180, 320], drop: { item: 'escama', chance: 0.45 } },
  { nome: 'Lich Ancião', emoji: '☠️', nivel: 30, hp: 800, atk: 90, def: 42, xp: 400, moedas: [300, 520], drop: { item: 'essencia_lich', chance: 0.5 } },
];

module.exports = { CLASSES, ITENS, LOJA, MONSTROS };
