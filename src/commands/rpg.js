const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const db = require('../db');
const { CLASSES, ITENS, LOJA } = require('../rpg/dados');
const N = require('../rpg/nucleo');
const C = require('../rpg/combate');

const EPH = MessageFlags.Ephemeral;
const classesEscolhas = Object.entries(CLASSES).map(([v, c]) => ({ name: `${c.emoji} ${c.nome}`, value: v }));
const attrEscolhas = [
  { name: 'Força', value: 'forca' },
  { name: 'Agilidade', value: 'agilidade' },
  { name: 'Inteligência', value: 'inteligencia' },
  { name: 'Sorte', value: 'sorte' },
];

const itemOpt = (o) => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true);
const qtdOpt = (o) => o.setName('quantidade').setDescription('Quantidade (padrão 1)').setMinValue(1).setMaxValue(99);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpg')
    .setDescription('Sistema de RPG da house')
    .addSubcommand((s) => s.setName('criar').setDescription('Cria seu personagem de RPG')
      .addStringOption((o) => o.setName('classe').setDescription('Sua classe').setRequired(true).addChoices(...classesEscolhas))
      .addStringOption((o) => o.setName('personagem').setDescription('Nome do seu personagem da house').setMaxLength(40)))
    .addSubcommand((s) => s.setName('personagem').setDescription('Muda o nome do seu personagem')
      .addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(40)))
    .addSubcommand((s) => s.setName('perfil').setDescription('Mostra o perfil de RPG')
      .addUserOption((o) => o.setName('membro').setDescription('Outro membro')))
    .addSubcommand((s) => s.setName('explorar').setDescription('Enfrenta um monstro'))
    .addSubcommand((s) => s.setName('treinar').setDescription('Treina um pouco (cooldown de 5 min)'))
    .addSubcommand((s) => s.setName('diario').setDescription('Recompensa diária'))
    .addSubcommand((s) => s.setName('loja').setDescription('Mostra a loja'))
    .addSubcommand((s) => s.setName('comprar').setDescription('Compra um item')
      .addStringOption(itemOpt).addIntegerOption(qtdOpt))
    .addSubcommand((s) => s.setName('vender').setDescription('Vende um item (50% do preço)')
      .addStringOption(itemOpt).addIntegerOption(qtdOpt))
    .addSubcommand((s) => s.setName('inventario').setDescription('Mostra seu inventário'))
    .addSubcommand((s) => s.setName('usar').setDescription('Usa um item de cura')
      .addStringOption(itemOpt))
    .addSubcommand((s) => s.setName('equipar').setDescription('Equipa uma arma ou armadura')
      .addStringOption(itemOpt))
    .addSubcommand((s) => s.setName('atributo').setDescription('Distribui pontos de atributo')
      .addStringOption((o) => o.setName('atributo').setDescription('Qual atributo').setRequired(true).addChoices(...attrEscolhas))
      .addIntegerOption((o) => o.setName('pontos').setDescription('Quantos pontos (padrão 1)').setMinValue(1).setMaxValue(99)))
    .addSubcommand((s) => s.setName('ranking').setDescription('Top 10 da house'))
    .addSubcommand((s) => s.setName('duelo').setDescription('Desafia um membro para um duelo')
      .addUserOption((o) => o.setName('membro').setDescription('Oponente').setRequired(true))
      .addIntegerOption((o) => o.setName('aposta').setDescription('Moedas apostadas (padrão 0)').setMinValue(0).setMaxValue(100000))),

  async execute(interaction) {
    const canal = db.get('config.rpg.canal', null);
    if (canal && interaction.channelId !== canal) {
      return interaction.reply({ content: `Use o RPG em <#${canal}>.`, flags: EPH });
    }

    const sub = interaction.options.getSubcommand();
    const id = interaction.user.id;

    if (sub === 'criar') {
      if (N.obter(id)) return interaction.reply({ content: 'Você já tem um personagem. Veja com `/rpg perfil`.', flags: EPH });
      const classe = interaction.options.getString('classe');
      const nome = interaction.options.getString('personagem');
      const j = N.criar(id, classe, nome);
      const c = CLASSES[classe];
      return interaction.reply({
        content: `${c.emoji} Personagem criado! Você é um(a) **${c.nome}** e ganhou 💰 100 moedas e 3 poções pequenas.\nHabilidade: **${c.hab.nome}** — ${c.hab.desc}\nComece com \`/rpg explorar\`.`,
        embeds: [N.embedPerfil(j, interaction.user)],
      });
    }

    if (sub === 'perfil') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const j = N.obter(alvo.id);
      if (!j) return interaction.reply({ content: alvo.id === id ? 'Crie seu personagem com `/rpg criar`.' : 'Esse membro ainda não criou personagem.', flags: EPH });
      return interaction.reply({ embeds: [N.embedPerfil(j, alvo)] });
    }

    if (sub === 'ranking') {
      const lista = Object.entries(N.todos())
        .sort((a, b) => b[1].nivel - a[1].nivel || b[1].xp - a[1].xp)
        .slice(0, 10);
      if (!lista.length) return interaction.reply({ content: 'Ninguém criou personagem ainda.', flags: EPH });
      const medalhas = ['🥇', '🥈', '🥉'];
      const txt = lista.map(([uid, j], i) => `${medalhas[i] || `**${i + 1}.**`} <@${uid}> — ${CLASSES[j.classe].emoji} ${j.personagem || CLASSES[j.classe].nome} · Nv **${j.nivel}** · ${j.vitorias} vitórias`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(N.COR).setTitle('🏆 Ranking da house').setDescription(txt)] });
    }

    if (sub === 'loja') {
      const txt = LOJA.map((k) => {
        const i = ITENS[k];
        const info = i.tipo === 'consumo' ? `cura ${i.cura} HP` : `+${i.bonus} ${i.tipo === 'arma' ? 'ataque' : 'defesa'} · Nv ${i.nivelMin}+`;
        return `${i.emoji} **${i.nome}** — 💰 ${i.preco} (${info})`;
      }).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(N.COR).setTitle('🏪 Loja').setDescription(txt).setFooter({ text: 'Use /rpg comprar' })] });
    }

    // A partir daqui precisa de personagem
    const j = N.obter(id);
    if (!j) return interaction.reply({ content: 'Crie seu personagem com `/rpg criar`.', flags: EPH });

    if (sub === 'personagem') {
      j.personagem = interaction.options.getString('nome');
      N.salvar(id, j);
      return interaction.reply({ content: `✅ Seu personagem agora se chama **${j.personagem}**.`, flags: EPH });
    }

    if (sub === 'explorar') {
      const falta = N.restante(j, 'explorar');
      if (falta) return interaction.reply({ content: `⏳ Espere ${N.fmt(falta)} para explorar de novo.`, flags: EPH });
      if (j.hp <= 0) j.hp = 1;
      const e = C.iniciar(id, j);
      if (!e) return interaction.reply({ content: 'Você já está em um combate! Termine-o primeiro.', flags: EPH });
      N.definirCd(j, 'explorar', 20 * 1000);
      N.salvar(id, j);
      return interaction.reply({ embeds: [C.embedCombate(e, j)], components: C.botoes(id) });
    }

    if (sub === 'treinar') {
      const falta = N.restante(j, 'treinar');
      if (falta) return interaction.reply({ content: `⏳ Você está cansado. Volte em ${N.fmt(falta)}.`, flags: EPH });
      const xp = 10 + j.nivel * 3;
      const moedas = 5 + Math.floor(Math.random() * 11);
      let extra = '';
      if (Math.random() < 0.15) {
        const dano = Math.min(j.hp - 1, Math.floor(j.hpMax * 0.1));
        j.hp -= Math.max(0, dano);
        extra = `\n🤕 Você se machucou e perdeu ${Math.max(0, dano)} HP.`;
      }
      j.moedas += moedas;
      const subiu = N.ganharXp(j, xp);
      N.definirCd(j, 'treinar', 5 * 60 * 1000);
      N.salvar(id, j);
      return interaction.reply(`🏋️ Você treinou: ⭐ +${xp} XP · 💰 +${moedas}${extra}${subiu ? `\n🎉 **Subiu para o nível ${j.nivel}!**` : ''}`);
    }

    if (sub === 'diario') {
      const falta = N.restante(j, 'diario');
      if (falta) return interaction.reply({ content: `⏳ Próxima recompensa em ${N.fmt(falta)}.`, flags: EPH });
      const ultimo = j.ultimoDiario || 0;
      j.streak = Date.now() - ultimo < 48 * 3600 * 1000 ? (j.streak || 0) + 1 : 1;
      j.ultimoDiario = Date.now();
      const bonus = Math.min(j.streak, 7) * 0.1;
      const moedas = Math.round((100 + j.nivel * 20) * (1 + bonus));
      j.moedas += moedas;
      N.addItem(j, 'pocao_p', 1);
      N.definirCd(j, 'diario', 22 * 3600 * 1000);
      N.salvar(id, j);
      return interaction.reply(`🎁 Recompensa diária: 💰 **${moedas}** moedas e 1 🧪 Poção Pequena!\n🔥 Sequência: **${j.streak}** dia(s) (bônus de ${Math.round(bonus * 100)}%).`);
    }

    if (sub === 'inventario') {
      const itens = Object.entries(j.inv);
      const txt = itens.length ? itens.map(([k, q]) => `${N.nomeItem(k)} × **${q}**`).join('\n') : 'Vazio.';
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(N.COR).setTitle('🎒 Inventário').setDescription(txt).addFields({ name: '💰 Moedas', value: `${j.moedas}` })],
        flags: EPH,
      });
    }

    if (sub === 'comprar') {
      const item = interaction.options.getString('item');
      const q = interaction.options.getInteger('quantidade') || 1;
      const i = ITENS[item];
      if (!i || !LOJA.includes(item)) return interaction.reply({ content: 'Esse item não está à venda.', flags: EPH });
      if (i.nivelMin && j.nivel < i.nivelMin) return interaction.reply({ content: `Você precisa ser nível ${i.nivelMin} para comprar isso.`, flags: EPH });
      if (i.tipo !== 'consumo' && q > 1) return interaction.reply({ content: 'Equipamentos você compra um por vez.', flags: EPH });
      const total = i.preco * q;
      if (j.moedas < total) return interaction.reply({ content: `Faltam 💰 ${total - j.moedas} moedas.`, flags: EPH });
      j.moedas -= total;
      N.addItem(j, item, q);
      N.salvar(id, j);
      return interaction.reply({ content: `🛒 Você comprou ${q}× ${N.nomeItem(item)} por 💰 ${total}.`, flags: EPH });
    }

    if (sub === 'vender') {
      const item = interaction.options.getString('item');
      const q = interaction.options.getInteger('quantidade') || 1;
      const i = ITENS[item];
      if (!i || (j.inv[item] || 0) < q) return interaction.reply({ content: 'Você não tem essa quantidade.', flags: EPH });
      const total = Math.floor(i.preco * 0.5) * q;
      N.removerItem(j, item, q);
      j.moedas += total;
      N.salvar(id, j);
      return interaction.reply({ content: `💰 Você vendeu ${q}× ${N.nomeItem(item)} por ${total} moedas.`, flags: EPH });
    }

    if (sub === 'usar') {
      const item = interaction.options.getString('item');
      const i = ITENS[item];
      if (!i || i.tipo !== 'consumo' || !j.inv[item]) return interaction.reply({ content: 'Você não tem esse item de cura.', flags: EPH });
      if (C.obterAtivo(id)) return interaction.reply({ content: 'Em combate, use o botão Poção.', flags: EPH });
      if (j.hp >= j.hpMax) return interaction.reply({ content: 'Sua vida já está cheia.', flags: EPH });
      const cura = Math.min(i.cura, j.hpMax - j.hp);
      j.hp += cura;
      N.removerItem(j, item, 1);
      N.salvar(id, j);
      return interaction.reply({ content: `🧪 +${cura} HP (${j.hp}/${j.hpMax}).`, flags: EPH });
    }

    if (sub === 'equipar') {
      const item = interaction.options.getString('item');
      const i = ITENS[item];
      if (!i || !['arma', 'armadura'].includes(i.tipo) || !j.inv[item]) return interaction.reply({ content: 'Você não tem esse equipamento.', flags: EPH });
      if (j.nivel < (i.nivelMin || 1)) return interaction.reply({ content: `Precisa de nível ${i.nivelMin}.`, flags: EPH });
      const anterior = j.equip[i.tipo];
      N.removerItem(j, item, 1);
      if (anterior) N.addItem(j, anterior, 1);
      j.equip[i.tipo] = item;
      N.salvar(id, j);
      return interaction.reply({ content: `✅ Equipado: ${N.nomeItem(item)}.`, flags: EPH });
    }

    if (sub === 'atributo') {
      const attr = interaction.options.getString('atributo');
      const p = interaction.options.getInteger('pontos') || 1;
      if (j.pontos < p) return interaction.reply({ content: `Você só tem ${j.pontos} ponto(s).`, flags: EPH });
      j.pontos -= p;
      j.attr[attr] += p;
      const antes = j.hpMax;
      j.hpMax = N.hpMaxDe(j);
      j.hp += j.hpMax - antes;
      N.salvar(id, j);
      return interaction.reply({ content: `🎯 ${N.ATRIBUTOS[attr]} agora é **${j.attr[attr]}**. Pontos restantes: ${j.pontos}.`, flags: EPH });
    }

    if (sub === 'duelo') {
      const alvo = interaction.options.getUser('membro');
      const aposta = interaction.options.getInteger('aposta') || 0;
      if (alvo.bot || alvo.id === id) return interaction.reply({ content: 'Escolha outro membro.', flags: EPH });
      const outro = N.obter(alvo.id);
      if (!outro) return interaction.reply({ content: 'Esse membro não tem personagem.', flags: EPH });
      if (j.moedas < aposta) return interaction.reply({ content: 'Você não tem moedas suficientes para essa aposta.', flags: EPH });
      const linha = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rpg:d:ok:${id}:${alvo.id}:${aposta}`).setLabel('Aceitar').setEmoji('⚔️').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`rpg:d:no:${id}:${alvo.id}:${aposta}`).setLabel('Recusar').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({
        content: `⚔️ <@${alvo.id}>, **${interaction.user.username}** te desafiou para um duelo${aposta ? ` valendo 💰 **${aposta}**` : ''}!`,
        components: [linha],
      });
    }
  },
};
