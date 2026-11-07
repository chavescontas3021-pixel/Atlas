const { MessageFlags } = require('discord.js');
const N = require('../rpg/nucleo');
const C = require('../rpg/combate');
const Mot = require('../rpg/masmorra-motor');
const M = require('../rpg/masmorra');

const EPH = MessageFlags.Ephemeral;
const trancados = new Set(); // evita cliques duplos ao mesmo tempo

async function tratar(interaction) {
  const [, acao, uid] = interaction.customId.split(':');
  if (interaction.user.id !== uid) return interaction.reply({ content: 'Essa masmorra não é sua.', flags: EPH });

  const st = M.estado(uid);
  const j = N.obter(uid);
  if (!st || !j) return interaction.update({ content: '⌛ Essa masmorra já terminou.', embeds: [], components: [], files: [], attachments: [] });

  // ---------- Telas do acampamento ----------
  if (acao === 'sair') {
    return interaction.update({ components: M.botoesConfirmarSaida(uid) });
  }
  if (acao === 'voltar') {
    return interaction.update(M.painel(uid, st, j));
  }
  if (acao === 'sair2') {
    const res = M.sair(uid, j, st);
    return interaction.update({ content: '', embeds: [M.embedFinal('saiu', st, j, res)], components: [], files: [], attachments: [] });
  }
  if (acao === 'desc' || acao === 'pocao') {
    if (st.fase === 'combate') return interaction.update(M.painel(uid, st, j));
    if (acao === 'desc') {
      const r = M.descansar(uid, j, st);
      if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });
      st.ultimo = [`🏕️ Você descansou e recuperou **${r.cura}** HP.`];
    } else {
      const r = Mot.usarPocao(j);
      if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });
      N.salvar(uid, j);
      st.ultimo = [`🧪 Você usou uma poção e recuperou **${r.cura}** HP.`];
    }
    st.ganho = null;
    M.salvarEstado(uid, st);
    return interaction.update({ content: '', embeds: [M.embedAcampamento(st, j, false)], components: M.botoesAcampamento(uid, st, j), files: [], attachments: [] });
  }

  // ---------- Começar a luta ----------
  if (acao === 'avancar') {
    if (st.fase !== 'combate') M.proximo(uid, j, st);
    await interaction.deferUpdate();
    return interaction.editReply({ content: '', ...M.painel(uid, st, j) });
  }

  // ---------- Ações de combate ----------
  if (!['atq', 'hab', 'poc', 'fug'].includes(acao)) return;
  if (st.fase !== 'combate' || !st.e) return interaction.update(M.painel(uid, st, j));

  const e = st.e;
  const r = Mot.agir(e, j, acao);
  if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });
  await interaction.deferUpdate(); // desenhar o GIF leva um instante

  if (r.fim === 'derrota') {
    const files = C.arquivos(e, j, 'derrota');
    const log = e.log;
    const res = M.derrota(uid, j, st);
    return interaction.editReply({ content: '', embeds: [M.embedFinal('derrota', st, j, res, { log })], components: [], files, attachments: [] });
  }
  if (r.fim === 'vitoria') {
    const files = C.arquivos(e, j, 'vitoria');
    const log = e.log;
    const v = M.vitoria(uid, j, st);
    if (v.fim === 'concluida') {
      return interaction.editReply({ content: '', embeds: [M.embedFinal('concluida', st, j, v.res, { log })], components: [], files, attachments: [] });
    }
    return interaction.editReply({ content: '', embeds: [M.embedAcampamento(st, j, true)], components: M.botoesAcampamento(uid, st, j), files, attachments: [] });
  }
  if (r.fim === 'fuga') {
    st.fase = 'acampamento';
    st.ultimo = e.log;
    st.ganho = null;
    st.e = null;
    M.salvarEstado(uid, st);
    N.salvar(uid, j);
    return interaction.editReply({ content: '', embeds: [M.embedAcampamento(st, j, false)], components: M.botoesAcampamento(uid, st, j), files: [], attachments: [] });
  }

  // luta continua
  M.salvarEstado(uid, st);
  N.salvar(uid, j);
  return interaction.editReply({ content: '', embeds: [M.embedCombate(st, e, j)], components: M.botoesCombate(uid, e), files: C.arquivos(e, j), attachments: [] });
}

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isButton() || !interaction.customId.startsWith('masm:')) return;
    const uid = interaction.customId.split(':')[2];
    if (trancados.has(uid)) return interaction.deferUpdate().catch(() => {});
    trancados.add(uid);
    try {
      await tratar(interaction);
    } catch (erro) {
      console.error('[Masmorra] erro:', erro);
      const msg = { content: 'Ops, deu erro na masmorra. Use `/masmorra continuar`.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    } finally {
      trancados.delete(uid);
    }
  },
};
