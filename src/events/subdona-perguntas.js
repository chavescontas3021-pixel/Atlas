const N = require('../subdona/nucleo');
const K = require('../subdona/conhecimento');
const Interp = require('../subdona/interprete');
const B = require('../blacklist/nucleo');
const UI = require('../ui/componentes');

const ultimo = new Map();
const SEM_PING = { allowedMentions: { repliedUser: false, parse: [] } };

function limpo(t) { return String(t || '').replace(/<@[!&]?\d+>/g, ' ').replace(/@(everyone|here)/gi, ' ').replace(/\s+/g, ' ').trim(); }

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId || msg.system) return;
      if (!N.ativo() || B.esta(msg.author.id)) return;
      const cfg = N.perguntas();
      if (cfg.modo === 'off' || (cfg.modo === 'ausente' && !N.ausencia())) return;

      const canalDuvidas = cfg.canais.includes(msg.channelId) || (msg.channel && msg.channel.parentId && cfg.canais.includes(msg.channel.parentId));
      const marcou = !!(msg.mentions && msg.mentions.users && msg.mentions.users.has(client.user.id));
      if (!canalDuvidas && !marcou) return;
      if (require('../ticket/nucleo').ticketDoCanal(msg.channelId)) return;

      const texto = limpo(msg.content);
      if (texto.length < 6 || !K.ehPergunta(texto)) return;
      if (marcou && Interp.parece(texto) && (await N.podeMandar(client, msg.author.id))) return;
      const agora = Date.now();
      if (agora - (ultimo.get(msg.channelId) || 0) < 8000 || agora - (ultimo.get(msg.author.id) || 0) < 20000) return;
      ultimo.set(msg.channelId, agora); ultimo.set(msg.author.id, agora);
      if (ultimo.size > 2000) ultimo.clear();

      let resposta = null;
      let item = null;
      const achou = K.buscar(texto);
      if (achou) { resposta = achou.item.resposta; item = achou.item; K.usou(item.id); }
      if (!resposta) {
        K.anotarPendente(texto, msg.author.id);
        return void (await msg.reply({ ...UI.nota('Não sei responder isso com certeza. Anotei a pergunta para a staff responder.', 'aviso', { publica: true }), ...SEM_PING }).catch(() => {}));
      }
      await msg.reply({
        embeds: [UI.painel({ trilha: ['Atlas'], titulo: item ? item.pergunta : 'Resposta', descricao: resposta, rodape: item ? 'Resposta ensinada pela staff' : 'Resposta baseada no que a staff ensinou' })],
        ...SEM_PING,
      }).catch(() => {});
    } catch (erro) {
      console.error('[Sub dona] perguntas:', erro);
    }
  },
};
