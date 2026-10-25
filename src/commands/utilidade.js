const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const db = require('../db');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const NUMEROS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

function calcular(expr) {
  const limpa = expr.replace(/,/g, '.').replace(/\^/g, '**').replace(/\s+/g, '');
  if (!limpa || limpa.length > 100 || !/^[\d+\-*/().%]+$/.test(limpa)) return null;
  try {
    const r = Function(`"use strict"; return (${limpa});`)();
    return typeof r === 'number' && Number.isFinite(r) ? r : null;
  } catch {
    return null;
  }
}

function temPermissao(interaction, perm) {
  return interaction.memberPermissions && interaction.memberPermissions.has(perm);
}

function paraMs(txt) {
  const m = /^(\d+)\s*(s|m|h|d)$/i.exec(txt.trim());
  if (!m) return null;
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2].toLowerCase()];
  return parseInt(m[1], 10) * mult;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('util')
    .setDescription('Utilidades')
    .addSubcommand((s) => s.setName('calc').setDescription('Calculadora')
      .addStringOption((o) => o.setName('conta').setDescription('Ex: (2+3)*4 ou 2^10').setRequired(true)))
    .addSubcommand((s) => s.setName('enquete').setDescription('Cria uma enquete')
      .addStringOption((o) => o.setName('pergunta').setDescription('Pergunta').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('opcao1').setDescription('Opção 1').setRequired(true).setMaxLength(100))
      .addStringOption((o) => o.setName('opcao2').setDescription('Opção 2').setRequired(true).setMaxLength(100))
      .addStringOption((o) => o.setName('opcao3').setDescription('Opção 3').setMaxLength(100))
      .addStringOption((o) => o.setName('opcao4').setDescription('Opção 4').setMaxLength(100))
      .addStringOption((o) => o.setName('opcao5').setDescription('Opção 5').setMaxLength(100)))
    .addSubcommand((s) => s.setName('falar').setDescription('O Atlas fala algo (staff)')
      .addStringOption((o) => o.setName('texto').setDescription('Texto').setRequired(true).setMaxLength(1500))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal (padrão: este)')))
    .addSubcommand((s) => s.setName('limpar').setDescription('Apaga mensagens recentes (staff)')
      .addIntegerOption((o) => o.setName('quantidade').setDescription('1 a 100').setRequired(true).setMinValue(1).setMaxValue(100))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'calc') {
      const conta = interaction.options.getString('conta');
      const r = calcular(conta);
      if (r === null) return interaction.reply({ content: 'Conta inválida. Use números e + - * / ^ % ( ).', flags: EPH });
      return interaction.reply(`🧮 \`${conta}\` = **${Math.round(r * 1e10) / 1e10}**`);
    }

    if (sub === 'enquete') {
      const ops = [1, 2, 3, 4, 5]
        .map((n) => interaction.options.getString(`opcao${n}`))
        .filter(Boolean);
      const emb = new EmbedBuilder()
        .setColor(COR)
        .setTitle(`📊 ${interaction.options.getString('pergunta')}`)
        .setDescription(ops.map((o, i) => `${NUMEROS[i]} ${o}`).join('\n'))
        .setFooter({ text: `Enquete de ${interaction.user.username}` });
      await interaction.reply({ embeds: [emb] });
      const msg = await interaction.fetchReply();
      for (let i = 0; i < ops.length; i++) await msg.react(NUMEROS[i]).catch(() => {});
      return;
    }

    if (sub === 'falar') {
      if (!temPermissao(interaction, PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'Você precisa de Gerenciar Mensagens.', flags: EPH });
      }
      const canal = interaction.options.getChannel('canal') || interaction.channel;
      if (!canal.isTextBased()) return interaction.reply({ content: 'Esse canal não é de texto.', flags: EPH });
      try {
        await canal.send({ content: interaction.options.getString('texto'), allowedMentions: { parse: [] } });
      } catch {
        return interaction.reply({ content: 'Não consegui enviar nesse canal (falta permissão).', flags: EPH });
      }
      return interaction.reply({ content: `✅ Enviado em <#${canal.id}>.`, flags: EPH });
    }

    if (sub === 'limpar') {
      if (!temPermissao(interaction, PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'Você precisa de Gerenciar Mensagens.', flags: EPH });
      }
      const q = interaction.options.getInteger('quantidade');
      try {
        const apagadas = await interaction.channel.bulkDelete(q, true);
        return interaction.reply({ content: `🧹 ${apagadas.size} mensagem(ns) apagada(s). (Mensagens com mais de 14 dias não podem ser apagadas.)`, flags: EPH });
      } catch {
        return interaction.reply({ content: 'Não consegui apagar (falta permissão).', flags: EPH });
      }
    }
  },
};

// Comando de lembrete separado, exportado como segundo comando abaixo.
module.exports.paraMs = paraMs;
