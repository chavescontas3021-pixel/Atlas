const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const N = require('../vagas/nucleo');
const P = require('../vagas/personagens');

const EPH = MessageFlags.Ephemeral;
const ehStaff = (i) => !!(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.ManageGuild));

// Sugestões do /vaga pedir: vagas cadastradas livres + personagens do AniList (🟢 livre / 🔴 ocupado)
async function autocompletarPedido(interaction) {
  const texto = String(interaction.options.getFocused() || '').trim();
  const foco = N.norm(texto);
  const res = [];
  const vistos = new Set();
  const nome = (emoji, n, obra) => `${emoji} ${n}${obra ? ` · ${obra}` : ''}`.slice(0, 100);
  const cadastradas = N.todas().filter((v) => !v.ocupanteId && (!foco || N.norm(v.nome).includes(foco) || N.norm(v.grupo).includes(foco)));
  for (const v of cadastradas.slice(0, 8)) {
    res.push({ name: nome('🟢', v.nome, v.grupo), value: `v:${v.id}` });
    vistos.add(v.ext || `v:${v.id}`);
  }
  if (foco.length >= 2) {
    const achados = await P.buscar(texto, 2000);
    for (const c of achados) {
      if (res.length >= 25) break;
      if (vistos.has(c.chave)) continue;
      const v = N.acharPorChave(c.chave, c.nome, c.obra);
      if (v && !v.ocupanteId && vistos.has(v.ext || `v:${v.id}`)) continue;
      res.push({ name: nome(v && v.ocupanteId ? '🔴' : '🟢', c.nome, c.obra), value: c.chave });
    }
  }
  await interaction.respond(res.slice(0, 25)).catch(() => {});
}

async function autocompletar(interaction) {
  const foco = N.norm(interaction.options.getFocused());
  const sub = interaction.options.getSubcommand(false);
  let lista = N.todas();
  if (interaction.commandName === 'vaga') {
    lista = N.doUsuario(interaction.user.id);
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
  // vaga já cadastrada, ou (pedido novo) a vaga que talvez já exista com o mesmo personagem
  let vaga = p.vagaId ? N.obter(p.vagaId) : (p.novo ? N.acharPorChave(p.chave, p.novo.nome, p.novo.grupo) : null);

  if (aprovar) {
    if (!vaga && !p.novo) return interaction.reply({ content: '❌ Essa vaga não existe mais.', flags: EPH });
    if (vaga && vaga.ocupanteId) return interaction.reply({ content: `❌ Esse personagem já está ocupado por <@${vaga.ocupanteId}>.`, flags: EPH });
    if (N.doUsuario(p.userId).length >= N.limite()) return interaction.reply({ content: '❌ Essa pessoa já está no limite de vagas.', flags: EPH });
  }

  p.porId = interaction.user.id;
  await interaction.deferUpdate();
  if (aprovar) {
    if (!vaga) {
      vaga = { id: N.proximoId(), nome: p.novo.nome, grupo: p.novo.grupo || '', ext: p.novo.ext || p.chave, foto: p.novo.foto || null, auto: true, ocupanteId: null, desde: null };
      N.salvar(vaga);
    }
    await N.ocupar(interaction.guild, vaga, p.userId);
  }
  db.remover(`vagas.pedidos.${p.id}`);
  await interaction.message.edit({
    embeds: [N.embedPedido(p, vaga, aprovar ? 'aprovado' : 'recusado')],
    components: [N.botoesPedido(p.id, true)],
    allowedMentions: { parse: [] },
  }).catch(() => {});

  const user = await interaction.client.users.fetch(p.userId).catch(() => null);
  if (user) {
    const nome = N.infoPedido(p, vaga).nome;
    await user.send(aprovar ? `✅ Seu pedido pelo personagem **${nome}** foi aprovado!` : `❌ Seu pedido pelo personagem **${nome}** foi recusado.`).catch(() => {});
  }
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && interaction.commandName === 'vaga' && interaction.options.getSubcommand(false) === 'pedir') return await autocompletarPedido(interaction);
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
// fim do arquivo
