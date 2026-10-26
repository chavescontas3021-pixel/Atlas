const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');
const S = require('../extras/stars');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const HORA = 3600 * 1000;
const NIVEL_MAX = 20;

const ESPECIES = {
  gato: { emoji: '🐱', nome: 'Gato', preco: 300, desc: 'Sortudo: acha poções com mais frequência.', pocao: 0.25, stars: 1, xp: 1, cd: 60 },
  cachorro: { emoji: '🐶', nome: 'Cachorro', preco: 250, desc: 'Fiel: traz 15% mais stars nos passeios.', pocao: 0.1, stars: 1.15, xp: 1, cd: 60 },
  coelho: { emoji: '🐰', nome: 'Coelho', preco: 200, desc: 'Ligeiro: pode passear a cada 40 minutos.', pocao: 0.1, stars: 1, xp: 1, cd: 40 },
  raposa: { emoji: '🦊', nome: 'Raposa', preco: 400, desc: 'Esperta: ganha 25% mais XP.', pocao: 0.1, stars: 1, xp: 1.25, cd: 60 },
  coruja: { emoji: '🦉', nome: 'Coruja', preco: 500, desc: 'Sábia: mais XP e um pouco mais de stars.', pocao: 0.15, stars: 1.05, xp: 1.2, cd: 60 },
  dragao: { emoji: '🐉', nome: 'Dragãozinho', preco: 1500, desc: 'Lendário: +30% de stars e acha poções.', pocao: 0.2, stars: 1.3, xp: 1.1, cd: 60 },
};

const caminho = (uid) => `extras.pets.${uid}`;
const obter = (uid) => db.get(caminho(uid), null);
const xpNecessario = (n) => 30 + n * 20;
const custoComida = (p) => 15 + p.nivel * 3;
const sorteio = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmtMs = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

function ganharXpPet(p, qtd) {
  p.xp += qtd;
  let subiu = 0;
  while (p.nivel < NIVEL_MAX && p.xp >= xpNecessario(p.nivel)) {
    p.xp -= xpNecessario(p.nivel);
    p.nivel++;
    subiu++;
  }
  if (p.nivel >= NIVEL_MAX) p.xp = 0;
  return subiu;
}

function embedPet(p, dono) {
  const e = ESPECIES[p.especie];
  const agora = Date.now();
  const saciado = p.alimentadoAte > agora;
  const cd = Math.max(0, (p.cdPasseio || 0) - agora);
  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(`${e.emoji} ${p.nome}`)
    .setDescription(`${e.nome} de **${dono}**\n_${e.desc}_`)
    .addFields(
      { name: 'Nível', value: `${p.nivel}${p.nivel >= NIVEL_MAX ? ' (máx.)' : ` — ${R.barra(p.xp, xpNecessario(p.nivel), 10)} ${p.xp}/${xpNecessario(p.nivel)}`}` },
      { name: 'Fome', value: saciado ? `😊 Saciado até <t:${Math.floor(p.alimentadoAte / 1000)}:R>` : '😋 Com fome (alimente para passear)', inline: true },
      { name: 'Passeio', value: cd ? `⏳ em ${fmtMs(cd)}` : '✅ disponível', inline: true },
      { name: 'Passeios feitos', value: `${p.passeios || 0}`, inline: true },
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pet')
    .setDescription('Seu bichinho de estimação')
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os bichinhos disponíveis para adotar'))
    .addSubcommand((s) => s.setName('adotar').setDescription('Adota um pet (gasta stars)')
      .addStringOption((o) => o.setName('especie').setDescription('Qual bichinho').setRequired(true)
        .addChoices(...Object.entries(ESPECIES).map(([id, e]) => ({ name: `${e.emoji} ${e.nome} — ${e.preco} stars`, value: id }))))
      .addStringOption((o) => o.setName('nome').setDescription('Nome do pet').setRequired(true).setMaxLength(30)))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o pet de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)')))
    .addSubcommand((s) => s.setName('alimentar').setDescription('Dá comida ao pet (dura 12 horas)'))
    .addSubcommand((s) => s.setName('passear').setDescription('Leva o pet para passear e achar stars'))
    .addSubcommand((s) => s.setName('renomear').setDescription('Muda o nome do pet')
      .addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(30)))
    .addSubcommand((s) => s.setName('soltar').setDescription('Solta o pet (não tem volta!)')
      .addBooleanOption((o) => o.setName('confirmar').setDescription('Marque sim para confirmar').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;
    const responder = (content) => interaction.reply({ content, flags: EPH });

    if (sub === 'lista') {
      const txt = Object.values(ESPECIES).map((e) => `${e.emoji} **${e.nome}** — ⭐ ${e.preco}\n${e.desc}`).join('\n\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(COR).setTitle('🐾 Bichinhos para adotar').setDescription(txt).setFooter({ text: 'Use /pet adotar' })], flags: EPH });
    }

    if (sub === 'ver') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const p = obter(alvo.id);
      if (!p) return responder(alvo.id === uid ? 'Você ainda não tem um pet. Veja `/pet lista` e adote com `/pet adotar`.' : 'Essa pessoa ainda não tem um pet.');
      return interaction.reply({ embeds: [embedPet(p, alvo.username)] });
    }

    if (sub === 'adotar') {
      if (obter(uid)) return responder('❌ Você já tem um pet. Solte-o com `/pet soltar` se quiser outro.');
      const id = interaction.options.getString('especie');
      const e = ESPECIES[id];
      const r = S.gastar(uid, e.preco);
      if (r.erro) return responder(`❌ ${r.erro}`);
      const p = { especie: id, nome: interaction.options.getString('nome').trim(), nivel: 1, xp: 0, alimentadoAte: Date.now() + 6 * HORA, cdPasseio: 0, passeios: 0, adotadoEm: Date.now() };
      db.set(caminho(uid), p);
      return interaction.reply({ content: `🎉 Você adotou ${e.emoji} **${p.nome}**! Ele já veio alimentado por 6 horas.`, embeds: [embedPet(p, interaction.user.username)] });
    }

    const p = obter(uid);
    if (!p) return responder('Você ainda não tem um pet. Veja `/pet lista`.');
    const e = ESPECIES[p.especie];
    const agora = Date.now();

    if (sub === 'renomear') {
      p.nome = interaction.options.getString('nome').trim();
      db.set(caminho(uid), p);
      return responder(`✅ Agora o nome é **${p.nome}**.`);
    }

    if (sub === 'soltar') {
      if (!interaction.options.getBoolean('confirmar')) return responder('Ufa, o pet continua com você. 💜');
      db.remover(caminho(uid));
      return responder(`👋 ${e.emoji} **${p.nome}** foi solto na natureza.`);
    }

    if (sub === 'alimentar') {
      if (p.alimentadoAte - agora > 6 * HORA) return responder(`😊 ${p.nome} ainda está satisfeito (até <t:${Math.floor(p.alimentadoAte / 1000)}:R>).`);
      const custo = custoComida(p);
      const r = S.gastar(uid, custo);
      if (r.erro) return responder(`❌ ${r.erro}`);
      p.alimentadoAte = Math.max(agora, p.alimentadoAte) + 12 * HORA;
      const subiu = ganharXpPet(p, 5);
      db.set(caminho(uid), p);
      return interaction.reply(`🍖 ${e.emoji} **${p.nome}** comeu muito bem! (⭐ -${custo}, ✨ +5 XP)${subiu ? `\n🎉 Subiu para o nível **${p.nivel}**!` : ''}`);
    }

    if (sub === 'passear') {
      if (p.alimentadoAte <= agora) return responder(`😋 ${p.nome} está com fome! Use \`/pet alimentar\` antes do passeio.`);
      const falta = (p.cdPasseio || 0) - agora;
      if (falta > 0) return responder(`⏳ ${p.nome} está descansando. Volta em ${fmtMs(falta)}.`);
      const j = R.obter(uid);
      if (!j) return responder(S.SEM_RPG);
      const stars = Math.round(sorteio(15, 40) * (1 + (p.nivel - 1) * 0.1) * e.stars);
      const xp = Math.round(sorteio(10, 20) * e.xp);
      j.moedas += stars;
      let extra = '';
      if (Math.random() < e.pocao) {
        R.addItem(j, 'pocao_p', 1);
        extra = '\n🧪 Ele achou uma **Poção Pequena**!';
      }
      R.salvar(uid, j);
      p.cdPasseio = agora + e.cd * 60000;
      p.passeios = (p.passeios || 0) + 1;
      const subiu = ganharXpPet(p, xp);
      db.set(caminho(uid), p);
      return interaction.reply(`🌳 ${e.emoji} **${p.nome}** passeou e trouxe ⭐ **${stars}** stars! (✨ +${xp} XP do pet)${extra}${subiu ? `\n🎉 **${p.nome}** subiu para o nível **${p.nivel}**!` : ''}`);
    }
  },
};
