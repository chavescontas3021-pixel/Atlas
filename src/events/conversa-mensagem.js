// Atlas conversando: responde só no canal liberado, respeita o tempo de espera
// e NUNCA responde quem está na blacklist.
const db = require('../db');
const N = require('../conversa/nucleo');
const B = require('../blacklist/nucleo');

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId || msg.system) return;
      if (!N.ligado()) return;

      const canal = N.canal();
      if (!canal || msg.channelId !== canal) return;

      // Comandos com prefixo (ex.: !ajuda) não são conversa
      const prefixo = db.get('config.prefixo', '!');
      if (prefixo && (msg.content || '').startsWith(prefixo)) return;

      if (!(await N.chamouAtlas(client, msg))) return;

      // Blacklist: silêncio total, sem nem reagir
      if (B.esta(msg.author.id)) return;

      const uid = msg.author.id;
      const pai = await N.ehPai(client, uid);

      if (N.esperaRestante(uid, pai) > 0) {
        msg.react('⏳').catch(() => {});
        return;
      }
      N.marcarFala(uid);

      msg.channel.sendTyping().catch(() => {});
      await dorme(500 + Math.floor(Math.random() * 900));

      const resposta = await N.responder({
        conteudo: msg.content,
        uid,
        nome: (msg.member && msg.member.displayName) || msg.author.username,
        pai,
        client,
      });

      const { assunto, ...envio } = resposta;
      await msg.reply({ ...envio, allowedMentions: { repliedUser: false, parse: [] } });
    } catch (erro) {
      console.error('[Conversa]', erro);
    }
  },
};
