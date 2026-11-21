const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const Modo = require('../modo/nucleo');
const D = require('../formsrv/dados');
const F = require('../formsrv/fluxo');
const Dono = require('../formsrv/dono');
const Entrada = require('../entrada/nucleo');

module.exports = {
  global: true,
  data: new SlashCommandBuilder().setName('forms').setDescription('Pedidos de servidor e servidores da Atlas (só o dono)')
    .addSubcommand((s) => s.setName('servidor').setDescription('Manda o formulário de pedido de servidor na DM de alguém')
      .addUserOption((o) => o.setName('usuario').setDescription('Quem vai preencher').setRequired(true)))
    .addSubcommand((s) => s.setName('lista').setDescription('Painel com todos os pedidos'))
    .addSubcommand((s) => s.setName('servidores').setDescription('Mostra os servidores onde a Atlas está'))
    .addSubcommand((s) => s.setName('sair').setDescription('Faz a Atlas sair de um servidor')
      .addStringOption((o) => o.setName('servidor').setDescription('ID do servidor (veja em /forms servidores)').setRequired(true))),

  async execute(interaction, client) {
    client = client || interaction.client;
    const flags = interaction.inGuild() ? { flags: MessageFlags.Ephemeral } : {};
    const resp = (x) => interaction.reply({ ...(typeof x === 'string' ? { content: x } : x), ...flags });
    if (!(await Modo.ehDono(client, interaction.user.id))) return resp('Só o dono usa este comando.');
    const sub = interaction.options.getSubcommand();

    if (sub === 'servidor') {
      const u = interaction.options.getUser('usuario');
      if (u.bot) return resp('Escolha uma pessoa, não um bot.');
      const p = D.criar(u.id, u.username); p.nome = u.globalName || u.username; D.salvar(p);
      try { await u.send(F.intro(p, p.nome)); }
      catch { p.status = 'cancelado'; D.salvar(p); return resp(`Não consegui mandar DM para ${u.username}. As mensagens privadas dela estão fechadas.`); }
      return resp(`Formulário enviado para **${u.username}** (pedido ${p.id}). Quando ela terminar, o pedido chega na sua DM.`);
    }
    if (sub === 'lista') return resp(Dono.painel());
    if (sub === 'servidores') {
      const l = [...client.guilds.cache.values()];
      return resp({ embeds: [new EmbedBuilder().setColor(0x5b6cff).setTitle(`Servidores (${l.length})`).setDescription(l.length ? l.map((g) => `**${g.name}** · ${g.memberCount} membros · \`${g.id}\``).join('\n').slice(0, 3900) : 'Não estou em nenhum servidor.')] });
    }
    const g = client.guilds.cache.get(interaction.options.getString('servidor').trim());
    if (!g) return resp('Não encontrei esse servidor. Veja os IDs em `/forms servidores`.');
    await resp(`Saindo de **${g.name}**.`);
    return Entrada.sair(client, g, 'pedido do dono');
  },
};
