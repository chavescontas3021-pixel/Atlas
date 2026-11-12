const db = require('../db');
const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');
const Rep = require('../recepcao/rep');

// ===== MUDE AQUI =====
// Com os cargos de rep configurados, o Atlas espera o membro escolher os cargos no onboarding.
// Se passar esse tempo, ele confere de novo: só abre a recepção para quem tem o cargo "sem vaga".
const ESPERA_MINUTOS = 15;
// =====================

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    if (member.user.bot) return;
    if (!U.cfg('ativo', false)) return;
    try {
      // Entrou de novo: esquece que ele era apenas representante ou que a staff tinha encerrado a recepção
      db.remover(`recepcao.reps.${member.id}`);
      db.remover(`recepcao.dispensados.${member.id}`);

      // Sem cargo "sem vaga" e sem cargos de rep configurados: funciona como antes (abre para todos)
      if (!Rep.cargoId('semVaga') && !Rep.repConfigurado()) {
        await F.iniciarRecepcao(member);
        return;
      }
      // Já entrou com os cargos? Decide agora
      await Rep.talvezIniciar(member);
      // Se ainda não decidiu, tenta de novo depois do tempo de espera
      setTimeout(async () => {
        try {
          const atual = await member.guild.members.fetch(member.id).catch(() => null);
          if (atual) await Rep.talvezIniciar(atual);
        } catch (erro) {
          console.error('[Recepção] erro na espera:', erro);
        }
      }, ESPERA_MINUTOS * 60 * 1000);
    } catch (erro) {
      console.error('[Recepção] erro ao iniciar:', erro);
    }
  },
};
