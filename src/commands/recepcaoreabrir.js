const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');
const L = require('../logs/nucleo');

const EPH = MessageFlags.Ephemeral;
const reabrindo = new Set(); // evita reabrir duas vezes ao mesmo tempo (clique duplo)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recepcaoreabrir')
    .setDescription('Reabre a recepção de um membro, do zero (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('membro').setDescription('Quem vai refazer a recepção').setRequired(true)),

  async execute(interaction) {
    const responder = (content) => interaction.reply({ content, flags: EPH });
    if (!interaction.inGuild()) return responder('Use este comando no servidor.');
    if (!F.ehStaffRecepcao(interaction)) return responder('❌ Só a staff pode reabrir uma recepção.');

    const user = interaction.options.getUser('membro');
    if (user.bot) return responder('❌ Bots não passam pela recepção.');

    const membro = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!membro) return responder('❌ Esse usuário não está no servidor.');

    const verificado = U.cfg('cargos.verificado');
    if (verificado && membro.roles.cache.has(verificado)) {
      return responder('❌ Esse membro já é verificado. Se ele precisa refazer a recepção, tire o cargo de verificado antes.');
    }
    if (reabrindo.has(user.id)) return responder('⏳ Já estou reabrindo a recepção dele, aguarde um instante.');

    await interaction.deferReply({ flags: EPH });
    reabrindo.add(user.id);
    try {
      // Limpa as marcas que impediam a recepção de abrir (apenas representante / encerrada pela staff)
      db.remover(`recepcao.reps.${user.id}`);
      db.remover(`recepcao.dispensados.${user.id}`);
      const haviaAberta = !!db.get(`recepcao.sessoes.${user.id}`);

      // Cria o canal novo (se ainda existir um antigo, ele é apagado e substituído)
      const canal = await F.iniciarRecepcao(membro);

      await L.enviar(
        interaction.guild,
        'membros',
        L.embed('azul', '🔄 Recepção reaberta', `${L.pessoa(user)} teve a recepção reaberta por ${L.pessoa(interaction.user)}.`, [
          ['Canal novo', `<#${canal.id}>`, true],
          ['Havia recepção aberta?', haviaAberta ? 'Sim (foi substituída)' : 'Não', true],
        ])
      );
      return interaction.editReply(`✅ Recepção reaberta para ${membro}: ${canal}`);
    } catch (erro) {
      console.error('[Recepção] reabrir:', erro);
      return interaction.editReply(`⚠️ Não consegui reabrir a recepção: ${erro.message}\nConfira se o Atlas pode criar canais e gerenciar cargos.`);
    } finally {
      reabrindo.delete(user.id);
    }
  },
};
