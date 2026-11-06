const { MessageFlags } = require('discord.js');
const db = require('../db');
const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');
const Rep = require('../recepcao/rep');
const L = require('../logs/nucleo');

const EPH = MessageFlags.Ephemeral;
const reabrindo = new Set(); // evita reabrir duas vezes ao mesmo tempo (clique duplo)

async function reabrir(interaction) {
  const responder = (content) => interaction.reply({ content, flags: EPH });
  if (!interaction.inGuild()) return responder('Use este botão no servidor.');

  const membro = interaction.member;
  if (!db.get('config.recepcao.ativo', false)) {
    return responder('❌ A recepção está desligada no momento. Chame a staff.');
  }
  if (!Rep.cargoId('semVaga')) {
    return responder('❌ A staff ainda não configurou o cargo de sem vaga. Chame a staff.');
  }

  const verificado = U.cfg('cargos.verificado');
  if (verificado && membro.roles.cache.has(verificado)) {
    return responder('❌ Você já é verificado(a), não precisa de uma nova recepção.');
  }
  if (!Rep.temCargo(membro, 'semVaga')) {
    return responder('❌ Este painel é só para quem está **sem vaga**.');
  }

  // Já tem uma recepção aberta e o canal ainda existe: só mostra onde está
  const sessao = db.get(`recepcao.sessoes.${membro.id}`);
  if (sessao && sessao.canalId) {
    const canal =
      interaction.guild.channels.cache.get(sessao.canalId) ||
      (await interaction.guild.channels.fetch(sessao.canalId).catch(() => null));
    if (canal) return responder(`✅ Você já tem uma recepção aberta: ${canal}`);
  }

  if (reabrindo.has(membro.id)) return responder('⏳ Já estou abrindo a sua recepção, aguarde um instante.');

  await interaction.deferReply({ flags: EPH });
  reabrindo.add(membro.id);
  try {
    // Limpa as marcas que impediam a recepção de abrir (apenas representante / encerrada pela staff)
    db.remover(`recepcao.reps.${membro.id}`);
    db.remover(`recepcao.dispensados.${membro.id}`);

    const canal = await F.iniciarRecepcao(membro);

    await L.enviar(
      interaction.guild,
      'membros',
      L.embed('azul', '🔄 Recepção reaberta pelo membro', `${L.pessoa(interaction.user)} reabriu a própria recepção pelo painel.`, [
        ['Canal novo', `<#${canal.id}>`, true],
      ])
    );
    return interaction.editReply(`✅ Sua recepção foi aberta: ${canal}`);
  } catch (erro) {
    console.error('[Recepção] painel reabrir:', erro);
    return interaction.editReply('⚠️ Não consegui abrir a sua recepção agora. Chame a staff.');
  } finally {
    reabrindo.delete(membro.id);
  }
}

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isButton() || interaction.customId !== 'recpainel:reabrir') return;
    try {
      await reabrir(interaction);
    } catch (erro) {
      console.error('[Recepção] erro no painel:', erro);
      const msg = { content: 'Ops, deu erro nessa etapa. Chame a staff.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
