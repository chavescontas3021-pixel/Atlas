const db = require('../db');
const N = require('../noturno/nucleo');

// Durante o fechamento noturno, quem entrar numa call bloqueada é desconectado na hora
module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, antes, depois) {
    try {
      if (!depois || !depois.channelId || depois.channelId === antes.channelId) return;
      if (!N.cfg('ativo', false) || !db.get('noturno.trancado', false)) return;
      const membro = depois.member;
      if (!membro || membro.user.bot) return;
      if (!N.ehCanalVoz(depois.channel)) return;
      await membro.voice.disconnect('Fechamento noturno');
    } catch (erro) {
      console.error('[Noturno] erro ao tirar da call:', erro.message);
    }
  },
};
