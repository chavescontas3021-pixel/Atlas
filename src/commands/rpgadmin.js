const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../db');
const { ITENS } = require('../rpg/dados');
const N = require('../rpg/nucleo');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rpgadmin')
    .setDescription('Administração do RPG (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('stars').setDescription('Dá ou tira stars')
      .addUserOption((o) => o.setName('membro').setDescription('Membro').setRequired(true))
      .addIntegerOption((o) => o.setName('quantidade').setDescription('Use negativo para tirar').setRequired(true)))
    .addSubcommand((s) => s.setName('xp').setDescription('Dá XP')
      .addUserOption((o) => o.setName('membro').setDescription('Membro').setRequired(true))
      .addIntegerOption((o) => o.setName('quantidade').setDescription('XP').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('item').setDescription('Dá um item')
      .addUserOption((o) => o.setName('membro').setDescription('Membro').setRequired(true))
      .addStringOption((o) => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true))
      .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade (padrão 1)').setMinValue(1).setMaxValue(99)))
    .addSubcommand((s) => s.setName('resetar').setDescription('Apaga o personagem de um membro')
      .addUserOption((o) => o.setName('membro').setDescription('Membro').setRequired(true)))
    .addSubcommand((s) => s.setName('canal').setDescription('Limita o RPG a um canal (sem canal = libera geral)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal do RPG')))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração do RPG')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'canal') {
      const c = interaction.options.getChannel('canal');
      if (c) db.set('config.rpg.canal', c.id);
      else db.remover('config.rpg.canal');
      return interaction.reply({ content: c ? `✅ RPG limitado a <#${c.id}>.` : '✅ RPG liberado em todos os canais.', flags: EPH });
    }

    if (sub === 'status') {
      const canal = db.get('config.rpg.canal', null);
      const total = Object.keys(N.todos()).length;
      return interaction.reply({ content: `🎮 Canal: ${canal ? `<#${canal}>` : 'todos'}\n👥 Jogadores: **${total}**`, flags: EPH });
    }

    const alvo = interaction.options.getUser('membro');
    const j = N.obter(alvo.id);
    if (!j) return interaction.reply({ content: 'Esse membro não tem personagem.', flags: EPH });

    if (sub === 'resetar') {
      db.remover(`rpg.jogadores.${alvo.id}`);
      return interaction.reply({ content: `🗑️ Personagem de <@${alvo.id}> apagado.`, flags: EPH });
    }

    if (sub === 'stars') {
      const q = interaction.options.getInteger('quantidade');
      j.moedas = Math.max(0, j.moedas + q);
      N.salvar(alvo.id, j);
      return interaction.reply({ content: `⭐ <@${alvo.id}> agora tem **${j.moedas}** stars.`, flags: EPH });
    }

    if (sub === 'xp') {
      const q = interaction.options.getInteger('quantidade');
      const subiu = N.ganharXp(j, q);
      N.salvar(alvo.id, j);
      return interaction.reply({ content: `✨ <@${alvo.id}> ganhou ${q} XP${subiu ? ` e subiu para o nível ${j.nivel}` : ''}.`, flags: EPH });
    }

    if (sub === 'item') {
      const item = interaction.options.getString('item');
      const q = interaction.options.getInteger('quantidade') || 1;
      if (!ITENS[item]) return interaction.reply({ content: 'Item inválido.', flags: EPH });
      N.addItem(j, item, q);
      N.salvar(alvo.id, j);
      return interaction.reply({ content: `🎁 <@${alvo.id}> recebeu ${q}× ${N.nomeItem(item)}.`, flags: EPH });
    }
  },
};
