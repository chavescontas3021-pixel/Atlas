// Personagem em pixel art: aparência salva de cada pessoa, GIF pronto para mandar e o painel do editor.
const {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../db');
const A = require('./arte');

const COR = 0x6d3aa6;
const ARQUIVO = 'personagem.gif';
const caminho = (uid) => `personagem.aparencia.${uid}`;

const obter = (uid) => db.get(caminho(uid), null);
const tem = (uid) => !!obter(uid);
const aparencia = (uid) => A.normalizar(obter(uid));
const salvar = (uid, app) => db.set(caminho(uid), A.normalizar(app));

// Cache simples: o mesmo visual não é desenhado duas vezes
const cache = new Map();
function gif(app) {
  const a = A.normalizar(app);
  const chave = JSON.stringify(a);
  if (!cache.has(chave)) {
    if (cache.size >= 60) cache.delete(cache.keys().next().value);
    cache.set(chave, A.gifDe(a));
  }
  return cache.get(chave);
}

const anexo = (app) => new AttachmentBuilder(gif(app), { name: ARQUIVO });
const arquivos = (uid) => (tem(uid) ? [anexo(aparencia(uid))] : []);
function comImagem(embed, uid) {
  if (tem(uid)) embed.setImage(`attachment://${ARQUIVO}`);
  return embed;
}

// Resumo em texto do visual atual
function resumo(app) {
  const C = A.CATALOGO;
  const nomeEstilo = (p) => C[p].estilos[C[p].ids.indexOf(app[p].estilo)];
  return [
    `🧑 Pele: **${A.PELES[app.pele].nome}** · 👁️ Olhos: **${A.OLHOS[app.olhos].nome}**`,
    `💇 Cabelo: **${nomeEstilo('cabelo')}** (${A.CABELOS[app.cabelo.cor].nome})`,
    `🧥 Roupa: **${nomeEstilo('roupa')}** (${A.TECIDOS[app.roupa.cor].nome})`,
    `👖 Calça: **${nomeEstilo('calca')}** (${A.TECIDOS[app.calca.cor].nome}) · 🥾 Botas: **${A.TECIDOS[app.botas.cor].nome}**`,
    `🦇 Capa: **${nomeEstilo('capa')}**${app.capa.estilo === 'nenhuma' ? '' : ` (${A.TECIDOS[app.capa.cor].nome})`}`,
    `👑 Cabeça: **${nomeEstilo('cabeca')}** · ⚔️ Mão: **${nomeEstilo('mao')}**`,
  ].join('\n');
}

// Valor atual (índice de cor) de uma parte
function corAtual(app, parte) {
  if (parte === 'pele' || parte === 'olhos') return app[parte];
  return app[parte].cor;
}

// Mensagem completa do editor (imagem + menus + botões). Só quem abriu consegue mexer.
function painel(uid, parte = 'cabelo', aviso) {
  const app = aparencia(uid);
  const cat = A.CATALOGO[parte];
  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('🎨 Monte seu personagem')
    .setDescription(`Editando: **${cat.emoji} ${cat.nome}**\n\n${resumo(app)}`)
    .setImage(`attachment://${ARQUIVO}`)
    .setFooter({ text: 'Tudo é salvo na hora. Toque em Pronto quando terminar.' });
  const linhas = [];
  linhas.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(`pers:parte:${uid}`).setPlaceholder('O que você quer mudar?')
      .addOptions(A.PARTES.map((p) => ({ label: A.CATALOGO[p].nome, value: p, emoji: A.CATALOGO[p].emoji, default: p === parte }))),
  ));
  if (cat.estilos) {
    const atual = app[parte].estilo;
    linhas.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`pers:estilo:${uid}:${parte}`).setPlaceholder('Estilo')
        .addOptions(cat.estilos.map((nome, i) => ({ label: nome, value: cat.ids[i], default: cat.ids[i] === atual }))),
    ));
  }
  if (cat.cores) {
    const atual = corAtual(app, parte);
    linhas.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`pers:cor:${uid}:${parte}`).setPlaceholder('Cor')
        .addOptions(cat.cores.map((c, i) => ({ label: c.nome, value: String(i), default: i === atual }))),
    ));
  }
  linhas.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pers:rand:${uid}:${parte}`).setLabel('Aleatório').setEmoji('🎲').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`pers:reset:${uid}:${parte}`).setLabel('Padrão').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`pers:fim:${uid}`).setLabel('Pronto').setEmoji('✅').setStyle(ButtonStyle.Success),
  ));
  return { content: aviso || '', embeds: [embed], components: linhas, files: [anexo(app)], attachments: [] };
}

module.exports = { COR, ARQUIVO, obter, tem, aparencia, salvar, gif, anexo, arquivos, comImagem, resumo, painel };
// fim do arquivo
