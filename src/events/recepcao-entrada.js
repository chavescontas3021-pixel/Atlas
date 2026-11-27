const db = require('../db');
const U = require('../recepcao/util');
const F = require('../recepcao/fluxo');
const Rep = require('../recepcao/rep');

const ESPERA_MINUTOS = 15;

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    if (member.user.bot) return;
    if (!U.cfg('ativo', false)) return;
    try {
      db.remover(`recepcao.reps.${member.id}`);
      db.remover(`recepcao.dispensados.${member.id}`);

      if (!Rep.cargoId('semVaga') && !Rep.repConfigurado()) {
        await F.iniciarRecepcao(member);
        return;
      }
      await Rep.talvezIniciar(member);
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
