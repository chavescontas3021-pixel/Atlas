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

      // Ordem da sub dona (ex.: "atlas, silencia @fulano") dada por quem pode mandar: a conversa não responde
      try {
        const bruto = String(msg.content || '').replace(/<@!?\d+>/g, ' ').replace(/\batlas\b[\s,:;!.-]*/i, ' ').trim();
        if (require('../subdona/interprete').parece(bruto) && (await require('../subdona/nucleo').podeMandar(client, msg.author.id))) return;
      } catch { /* sub dona não instalada: segue a conversa normal */ }

      const uid = msg.author.id;
      const pai = await N.ehPai(client, uid);
      const alvo = !pai && N.ehAlvo(uid);

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
        alvo,
        client,
      });

      const { assunto, ...envio } = resposta;
      await msg.reply({ ...envio, allowedMentions: { repliedUser: false, parse: [] } });
    } catch (erro) {
      console.error('[Conversa]', erro);
    }
  },
};
