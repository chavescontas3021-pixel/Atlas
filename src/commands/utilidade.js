const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');
const Enquete = require('../enquete/nucleo');

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
    .addSubcommand((s) => s.setName('enquete').setDescription('Cria uma enquete votada por botões')
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
      if (r === null) return interaction.reply(UI.erro('Conta inválida. Use números e + - * / ^ % ( ).'));
      const embed = UI.painel({
        trilha: ['Calculadora'],
        descricao: `\`${conta}\`\n${S.filho} **${Math.round(r * 1e10) / 1e10}**`,
      });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'enquete') {
      const opcoes = [1, 2, 3, 4, 5]
        .map((n) => interaction.options.getString(`opcao${n}`))
        .filter(Boolean);
      const dados = {
        pergunta: interaction.options.getString('pergunta'),
        opcoes,
        autorId: interaction.user.id,
        autorNome: interaction.member?.displayName || interaction.user.username,
      };
      // Mostra a enquete zerada, pega o id da mensagem e só então salva no banco
      await interaction.reply(Enquete.montar({ ...dados, votos: {}, encerrada: false }));
      const msg = await interaction.fetchReply();
      Enquete.criar(msg.id, dados);
      return;
    }

    if (sub === 'falar') {
      if (!temPermissao(interaction, PermissionFlagsBits.ManageMessages)) {
        return interaction.reply(UI.erro('Você precisa da permissão **Gerenciar Mensagens**.'));
      }
      const canal = interaction.options.getChannel('canal') || interaction.channel;
      if (!canal.isTextBased()) return interaction.reply(UI.erro('Esse canal não é de texto.'));
      try {
        await canal.send({ content: interaction.options.getString('texto'), allowedMentions: { parse: [] } });
      } catch {
        return interaction.reply(UI.erro('Não consegui enviar nesse canal (falta permissão).'));
      }
      return interaction.reply(UI.ok(`Mensagem enviada em <#${canal.id}>.`));
    }

    if (sub === 'limpar') {
      if (!temPermissao(interaction, PermissionFlagsBits.ManageMessages)) {
        return interaction.reply(UI.erro('Você precisa da permissão **Gerenciar Mensagens**.'));
      }
      const q = interaction.options.getInteger('quantidade');
      try {
        const apagadas = await interaction.channel.bulkDelete(q, true);
        return interaction.reply(UI.ok(`${apagadas.size} mensagem(ns) apagada(s). Mensagens com mais de 14 dias não podem ser apagadas.`));
      } catch {
        return interaction.reply(UI.erro('Não consegui apagar (falta permissão).'));
      }
    }
  },
};

// Usado também pelo comando de lembrete.
module.exports.paraMs = paraMs;
