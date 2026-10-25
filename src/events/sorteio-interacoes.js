const { MessageFlags } = require('discord.js');
const RPG = require('../rpg/nucleo');
const N = require('../eventos/nucleo');

const EPH = MessageFlags.Ephemeral;

async function entrarSorteio(interaction, id) {
  const s = N.getSorteio(id);
  if (!s || s.status !== 'ativo') {
    return interaction.reply({ content: 'Esse sorteio já acabou.', flags: EPH });
  }
  const uid = interaction.user.id;
  const i = s.participantes.indexOf(uid);
  let aviso;

  if (i >= 0) {
    s.participantes.splice(i, 1);
    aviso = '↩️ Você saiu do sorteio.';
  } else {
    if (s.cargoExigido && !interaction.member.roles.cache.has(s.cargoExigido)) {
      return interaction.reply({ content: `❌ Você precisa do cargo <@&${s.cargoExigido}> para participar.`, flags: EPH });
    }
    const j = RPG.obter(uid);
    if ((s.premioTipo === 'stars' || s.nivelMin) && !j) {
      return interaction.reply({ content: '❌ Para participar você precisa de um personagem de RPG. Use `/rpg criar`.', flags: EPH });
    }
    if (s.nivelMin && j.nivel < s.nivelMin) {
      return interaction.reply({ content: `❌ Você precisa ser nível ${s.nivelMin} no RPG (você é nível ${j.nivel}).`, flags: EPH });
    }
    s.participantes.push(uid);
    aviso = '🎉 Você está participando! Boa sorte.';
  }

  N.salvarSorteio(s);
  await interaction.update({ embeds: [N.embedSorteio(s)], components: N.botoesSorteio(s) });
  await interaction.followUp({ content: aviso, flags: EPH });
}

async function confirmarEvento(interaction, id) {
  const e = N.getEvento(id);
  if (!e || !(e.status === 'ativo' || e.status === 'iniciado')) {
    return interaction.reply({ content: 'Esse evento não está mais aberto.', flags: EPH });
  }
  const uid = interaction.user.id;
  const i = e.confirmados.indexOf(uid);
  let aviso;
  if (i >= 0) {
    e.confirmados.splice(i, 1);
    aviso = '↩️ Presença removida.';
  } else {
    e.confirmados.push(uid);
    aviso = '✅ Presença confirmada! Eu te aviso quando for começar.';
  }
  N.salvarEvento(e);
  await interaction.update({ embeds: [N.embedEvento(e)], components: N.botoesEvento(e) });
  await interaction.followUp({ content: aviso, flags: EPH });
}

async function listaEvento(interaction, id) {
  const e = N.getEvento(id);
  if (!e) return interaction.reply({ content: 'Evento não encontrado.', flags: EPH });
  const txt = e.confirmados.length ? N.mencoes(e.confirmados, 60) : 'Ninguém confirmou ainda.';
  return interaction.reply({ content: `👥 **Confirmados (${e.confirmados.length}):**\n${txt}`, flags: EPH, allowedMentions: { parse: [] } });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    const [tipo, acao, id] = interaction.customId.split(':');
    try {
      if (tipo === 'sorteio' && acao === 'entrar') return await entrarSorteio(interaction, id);
      if (tipo === 'evento' && acao === 'vou') return await confirmarEvento(interaction, id);
      if (tipo === 'evento' && acao === 'lista') return await listaEvento(interaction, id);
    } catch (err) {
      console.error('[Sorteio/Evento]', err);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Deu erro. Tente de novo.', flags: EPH });
        }
      } catch { /* ignora */ }
    }
  },
};
