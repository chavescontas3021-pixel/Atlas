const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../vagas/nucleo');

const EPH = MessageFlags.Ephemeral;
const ehStaff = (i) => !!(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.ManageGuild));

async function autocompletar(interaction) {
  const foco = N.norm(interaction.options.getFocused());
  const sub = interaction.options.getSubcommand(false);
  let lista = N.todas();
  if (interaction.commandName === 'vaga') {
    lista = sub === 'pedir' ? N.livres() : N.doUsuario(interaction.user.id);
  } else if (sub === 'ocupar') {
    lista = N.livres();
  } else if (sub === 'liberar') {
    lista = lista.filter((v) => v.ocupanteId);
  }
  const res = lista
    .filter((v) => N.norm(v.nome).includes(foco))
    .slice(0, 25)
    .map((v) => ({ name: `${v.nome}${v.grupo ? ` (${v.grupo})` : ''}`.slice(0, 100), value: v.id }));
  await interaction.respond(res).catch(() => {});
}

async function modalPainel(interaction) {
  const titulo = interaction.fields.getTextInputValue('titulo').trim();
  const texto = interaction.fields.getTextInputValue('texto').trim();
  if (!ehStaff(interaction)) return interaction.reply({ content: '❌ Só a staff.', flags: EPH });
  db.set('config.vagas.mensagens.painel', { titulo, texto });
  await interaction.deferReply({ flags: EPH });
  await N.atualizarPainel(interaction.guild);
  return interaction.editReply('✅ Texto do painel atualizado!');
}

async function decidir(interaction, aprovar) {
  if (!ehStaff(interaction)) return interaction.reply({ content: '❌ Só a staff decide os pedidos.', flags: EPH });
  const id = interaction.customId.split(':')[2];
  const p = N.pedido(id);
  if (!p) return interaction.update({ content: 'Esse pedido já foi resolvido.', components: [] });
  const vaga = N.obter(p.vagaId);

  if (aprovar) {
    if (!vaga) return interaction.reply({ content: '❌ Essa vaga não existe mais.', flags: EPH });
    if (vaga.ocupanteId) return interaction.reply({ content: '❌ Essa vaga já foi ocupada por alguém.', flags: EPH });
    if (N.doUsuario(p.userId).length >= N.limite()) return interaction.reply({ content: '❌ Essa pessoa já está no limite de vagas.', flags: EPH });
  }

  p.porId = interaction.user.id;
  await interaction.deferUpdate();
  if (aprovar) await N.ocupar(interaction.guild, vaga, p.userId);
  db.remover(`vagas.pedidos.${p.id}`);
  await interaction.message.edit({
    embeds: [N.embedPedido(p, vaga, aprovar ? 'aprovado' : 'recusado')],
    components: [N.botoesPedido(p.id, true)],
    allowedMentions: { parse: [] },
  }).catch(() => {});

  const user = await interaction.client.users.fetch(p.userId).catch(() => null);
  if (user) {
    const nome = vaga ? vaga.nome : 'a vaga';
    await user.send(aprovar ? `✅ Seu pedido pela vaga **${nome}** foi aprovado!` : `❌ Seu pedido pela vaga **${nome}** foi recusado.`).catch(() => {});
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && (interaction.commandName === 'vaga' || interaction.commandName === 'vagaadmin')) return await autocompletar(interaction);
      if (interaction.isModalSubmit() && interaction.customId === 'vagas:modal:painel') return await modalPainel(interaction);
      if (interaction.isButton() && interaction.customId.startsWith('vaga:aprovar:')) return await decidir(interaction, true);
      if (interaction.isButton() && interaction.customId.startsWith('vaga:recusar:')) return await decidir(interaction, false);
    } catch (err) {
      console.error('[Vagas]', err);
      try {
        if (interaction.isRepliable && interaction.isRepliable()) {
          const msg = 'Deu erro nas vagas. Tente de novo.';
          if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
          else await interaction.reply({ content: msg, flags: EPH });
        }
      } catch { /* ignora */ }
    }
  },
};
