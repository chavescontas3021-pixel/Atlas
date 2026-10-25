const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

const COR = 0xf5a3c7;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const RESPOSTAS = [
  'Sim, com certeza!', 'Tudo indica que sim.', 'Sem dúvida.', 'Provavelmente sim.',
  'Talvez...', 'Pergunte de novo mais tarde.', 'Não posso prever agora.',
  'Eu não contaria com isso.', 'Minha resposta é não.', 'Muito duvidoso.', 'Definitivamente não.',
];

const INTERACOES = {
  abraco: { emoji: '🤗', texto: (a, b) => `${a} abraçou ${b}!` },
  beijo: { emoji: '😘', texto: (a, b) => `${a} deu um beijo em ${b}!` },
  tapa: { emoji: '👋', texto: (a, b) => `${a} deu um tapa em ${b}!` },
  carinho: { emoji: '🥰', texto: (a, b) => `${a} fez carinho em ${b}!` },
  cutucar: { emoji: '👉', texto: (a, b) => `${a} cutucou ${b}!` },
  morder: { emoji: '😈', texto: (a, b) => `${a} mordeu ${b}!` },
  aperto: { emoji: '🤝', texto: (a, b) => `${a} apertou a mão de ${b}!` },
};

const PPT = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const GANHA = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };

function hashPar(a, b) {
  const [x, y] = [a, b].sort();
  let h = 0;
  for (const c of `${x}:${y}`) h = (h * 31 + c.charCodeAt(0)) % 101;
  return h;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('diversao')
    .setDescription('Comandos de diversão')
    .addSubcommand((s) => s.setName('8ball').setDescription('Pergunte à bola mágica')
      .addStringOption((o) => o.setName('pergunta').setDescription('Sua pergunta').setRequired(true).setMaxLength(200)))
    .addSubcommand((s) => s.setName('dado').setDescription('Rola dados')
      .addIntegerOption((o) => o.setName('lados').setDescription('Lados (padrão 6)').setMinValue(2).setMaxValue(1000))
      .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantos dados (padrão 1)').setMinValue(1).setMaxValue(10)))
    .addSubcommand((s) => s.setName('moeda').setDescription('Cara ou coroa'))
    .addSubcommand((s) => s.setName('escolher').setDescription('Escolhe entre opções')
      .addStringOption((o) => o.setName('opcoes').setDescription('Separe por vírgula ou |').setRequired(true).setMaxLength(500)))
    .addSubcommand((s) => s.setName('ship').setDescription('Compatibilidade entre duas pessoas')
      .addUserOption((o) => o.setName('primeiro').setDescription('Primeira pessoa').setRequired(true))
      .addUserOption((o) => o.setName('segundo').setDescription('Segunda pessoa (padrão: você)')))
    .addSubcommand((s) => s.setName('ppt').setDescription('Pedra, papel e tesoura contra o Atlas')
      .addStringOption((o) => o.setName('escolha').setDescription('Sua jogada').setRequired(true)
        .addChoices({ name: '🪨 Pedra', value: 'pedra' }, { name: '📄 Papel', value: 'papel' }, { name: '✂️ Tesoura', value: 'tesoura' })))
    .addSubcommand((s) => s.setName('interagir').setDescription('Interaja com alguém')
      .addStringOption((o) => o.setName('tipo').setDescription('Tipo de interação').setRequired(true).addChoices(
        { name: '🤗 Abraço', value: 'abraco' },
        { name: '😘 Beijo', value: 'beijo' },
        { name: '👋 Tapa', value: 'tapa' },
        { name: '🥰 Carinho', value: 'carinho' },
        { name: '👉 Cutucar', value: 'cutucar' },
        { name: '😈 Morder', value: 'morder' },
        { name: '🤝 Aperto de mão', value: 'aperto' },
      ))
      .addUserOption((o) => o.setName('membro').setDescription('Quem').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === '8ball') {
      const p = interaction.options.getString('pergunta');
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COR).setTitle('🎱 Bola mágica').addFields(
          { name: 'Pergunta', value: p },
          { name: 'Resposta', value: pick(RESPOSTAS) },
        )],
      });
    }

    if (sub === 'dado') {
      const lados = interaction.options.getInteger('lados') || 6;
      const qtd = interaction.options.getInteger('quantidade') || 1;
      const rolagens = Array.from({ length: qtd }, () => Math.floor(Math.random() * lados) + 1);
      const total = rolagens.reduce((a, b) => a + b, 0);
      return interaction.reply(`🎲 d${lados} × ${qtd}: **${rolagens.join(', ')}**${qtd > 1 ? ` (total **${total}**)` : ''}`);
    }

    if (sub === 'moeda') {
      return interaction.reply(`🪙 Deu **${Math.random() < 0.5 ? 'cara' : 'coroa'}**!`);
    }

    if (sub === 'escolher') {
      const ops = interaction.options.getString('opcoes').split(/[,|]/).map((x) => x.trim()).filter(Boolean);
      if (ops.length < 2) return interaction.reply({ content: 'Dê pelo menos 2 opções, separadas por vírgula ou |.', flags: MessageFlags.Ephemeral });
      return interaction.reply(`🤔 Eu escolho: **${pick(ops)}**`);
    }

    if (sub === 'ship') {
      const a = interaction.options.getUser('primeiro');
      const b = interaction.options.getUser('segundo') || interaction.user;
      const pct = hashPar(a.id, b.id);
      const cheio = Math.round(pct / 10);
      const barra = '💗'.repeat(cheio) + '🖤'.repeat(10 - cheio);
      const frase = pct >= 80 ? 'Casal perfeito!' : pct >= 50 ? 'Tem potencial!' : pct >= 25 ? 'Talvez como amigos...' : 'Complicado...';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COR).setTitle('💘 Ship').setDescription(`${a} + ${b}\n\n${barra}\n**${pct}%** — ${frase}`)],
        allowedMentions: { parse: [] },
      });
    }

    if (sub === 'ppt') {
      const eu = interaction.options.getString('escolha');
      const bot = pick(Object.keys(PPT));
      let r = 'Empate!';
      if (GANHA[eu] === bot) r = 'Você ganhou! 🎉';
      else if (GANHA[bot] === eu) r = 'Eu ganhei! 😎';
      return interaction.reply(`Você: ${PPT[eu]} · Eu: ${PPT[bot]}\n**${r}**`);
    }

    if (sub === 'interagir') {
      const tipo = interaction.options.getString('tipo');
      const alvo = interaction.options.getUser('membro');
      const i = INTERACOES[tipo];
      if (alvo.id === interaction.user.id) {
        return interaction.reply({ content: 'Escolha outra pessoa 😅', flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({
        content: `${i.emoji} ${i.texto(`**${interaction.user.username}**`, `<@${alvo.id}>`)}`,
        allowedMentions: { users: [alvo.id] },
      });
    }
  },
};
