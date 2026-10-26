const {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder,
} = require('discord.js');
const db = require('../db');
const N = require('../loja/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (interaction, content) => interaction.reply({ content, flags: EPH });
const itemOpt = (o) => o.setName('item').setDescription('Qual item').setRequired(true).setAutocomplete(true);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lojaadmin')
    .setDescription('Administra a loja de itens exclusivos (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra a configuração'))
    .addSubcommand((s) => s.setName('canal').setDescription('Canal onde chegam os pedidos de itens entregues pela staff')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal da staff').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('criar').setDescription('Cria um item')
      .addStringOption((o) => o.setName('nome').setDescription('Nome do item').setRequired(true).setMaxLength(60))
      .addIntegerOption((o) => o.setName('preco').setDescription('Preço em stars').setRequired(true).setMinValue(1).setMaxValue(10000000))
      .addStringOption((o) => o.setName('tipo').setDescription('O que o item faz').setRequired(true).addChoices(
        { name: '🎨 Dá um cargo automaticamente', value: 'cargo' },
        { name: '🎁 A staff entrega manualmente', value: 'manual' },
      ))
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo dado (só para o tipo cargo)'))
      .addStringOption((o) => o.setName('descricao').setDescription('Descrição curta').setMaxLength(150))
      .addIntegerOption((o) => o.setName('estoque').setDescription('Quantidade à venda (vazio = ilimitado)').setMinValue(1).setMaxValue(100000))
      .addIntegerOption((o) => o.setName('limite').setDescription('Quantas vezes cada pessoa pode comprar (padrão 1)').setMinValue(1).setMaxValue(99)))
    .addSubcommand((s) => s.setName('estoque').setDescription('Muda o estoque de um item')
      .addStringOption(itemOpt)
      .addIntegerOption((o) => o.setName('quantidade').setDescription('Nova quantidade (0 = esgotado)').setRequired(true).setMinValue(0).setMaxValue(100000)))
    .addSubcommand((s) => s.setName('remover').setDescription('Tira um item da loja').addStringOption(itemOpt)),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const canal = N.canalPedidos();
      const embed = new EmbedBuilder().setColor(0xf5a3c7).setTitle('🛍️ Loja do Atlas').addFields(
        { name: 'Canal de pedidos', value: canal ? `<#${canal}>` : 'não definido' },
        { name: 'Itens', value: `${N.itens().length}` },
      );
      return interaction.reply({ embeds: [embed], flags: EPH });
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      db.set('config.loja.canalPedidos', canal.id);
      return responder(interaction, `✅ Os pedidos de itens entregues pela staff chegarão em ${canal}.`);
    }

    if (sub === 'criar') {
      const nome = interaction.options.getString('nome').trim();
      const tipo = interaction.options.getString('tipo');
      const cargo = interaction.options.getRole('cargo');
      if (N.acharItem(nome)) return responder(interaction, '❌ Já existe um item com esse nome.');
      if (tipo === 'cargo' && !cargo) return responder(interaction, '❌ Para o tipo cargo, escolha também o **cargo**.');
      if (tipo === 'manual' && !N.canalPedidos()) return responder(interaction, '⚠️ Defina antes o canal de pedidos com `/lojaadmin canal` (é lá que a staff vê o que precisa entregar).');
      const item = {
        id: N.proximo('contador'),
        nome,
        preco: interaction.options.getInteger('preco'),
        tipo,
        cargoId: tipo === 'cargo' ? cargo.id : null,
        descricao: (interaction.options.getString('descricao') || '').trim(),
        estoque: interaction.options.getInteger('estoque') ?? null,
        limite: interaction.options.getInteger('limite') || 1,
      };
      N.salvar(item);
      return responder(interaction, `✅ Item **${item.nome}** criado por ⭐ ${item.preco}.${tipo === 'cargo' ? ' O cargo do bot precisa estar acima do cargo vendido.' : ''}`);
    }

    const item = N.acharItem(interaction.options.getString('item'));
    if (!item) return responder(interaction, '❌ Não achei esse item.');

    if (sub === 'estoque') {
      item.estoque = interaction.options.getInteger('quantidade');
      N.salvar(item);
      return responder(interaction, `✅ Estoque de **${item.nome}**: ${item.estoque}.`);
    }

    if (sub === 'remover') {
      N.remover(item.id);
      return responder(interaction, `🗑️ **${item.nome}** saiu da loja.`);
    }
  },
};
