const { GuildMemberFlags } = require('discord.js');
const Rep = require('../recepcao/rep');

const COMPLETOU = (GuildMemberFlags && GuildMemberFlags.CompletedOnboarding) || 2;
const HORA = 3600 * 1000;

// Decide a recepção quando o membro termina o onboarding ou pega o cargo "sem vaga"
module.exports = {
  name: 'guildMemberUpdate',
  async execute(client, antes, depois) {
    try {
      if (!depois || depois.user.bot || antes.partial) return;
      if (!Rep.repConfigurado() && !Rep.cargoId('semVaga')) return;

      // 1) Pegou o cargo "sem vaga" (quer vaga): passa pela recepção
      const semVaga = Rep.cargoId('semVaga');
      if (semVaga && !antes.roles.cache.has(semVaga) && depois.roles.cache.has(semVaga)) {
        const recemEntrou = Date.now() - (depois.joinedTimestamp || 0) < HORA;
        if (Rep.temRep(depois) || recemEntrou) await Rep.talvezIniciar(depois);
        return;
      }

      // 2) Terminou o onboarding: espera uns segundos os cargos chegarem e decide
      const terminou = !antes.flags.has(COMPLETOU) && depois.flags.has(COMPLETOU);
      if (terminou) {
        setTimeout(async () => {
          try {
            const atual = await depois.guild.members.fetch(depois.id).catch(() => null);
            if (atual) await Rep.talvezIniciar(atual);
          } catch (erro) {
            console.error('[Recepção] erro após onboarding:', erro);
          }
        }, 8000);
      }
    } catch (erro) {
      console.error('[Recepção] cargos:', erro);
    }
  },
};
