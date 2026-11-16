// Sub dona: (1) responde e anota recado quando marcam o pai ausente, (2) obedece ordens em texto.
const N = require('../subdona/nucleo');
const Interp = require('../subdona/interprete');
const Ordem = require('../subdona/ordem');
const Conversa = require('../conversa/nucleo');
const B = require('../blacklist/nucleo');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');

const SEM_PING = { allowedMentions: { repliedUser: false, parse: [] } };
const avisados = new Map(); // canal:pessoa → última vez que avisei que o pai está ausente

async function avisoAusencia(client, msg) {
  const aus = N.ausencia();
  if (!aus || msg.author.bot) return;
  const pai = await N.paiId(client);
  if (!pai || msg.author.id === pai) return;
  // Avisa quando: marcam o pai, respondem a uma mensagem dele, ou perguntam à Atlas onde ele está ("atlas, cadê o pai?")
  const marcouPai = msg.mentions.users.has(pai) || (msg.mentions.repliedUser && msg.mentions.repliedUser.id === pai);
  const f = String(msg.content || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const chamouAtlas = msg.mentions.users.has(client.user.id) || /\batlas\b/.test(f);
  const perguntou = chamouAtlas && /\b(pai|dono|dona)\b/.test(f) && /\b(cade|onde|esta|ta|volta|vem|responde|fala|sumiu|online|ausente|fora)\b/.test(f);
  if (!marcouPai && !perguntou) return;

  N.anotarRecado({ de: msg.author.id, canalId: msg.channelId, guildId: msg.guildId, msgId: msg.id, texto: msg.content.replace(/<@!?\d+>/g, '').trim() || '(só marcou você)' });
  const chave = `${msg.channelId}:${msg.author.id}`; // um aviso por pessoa a cada 3 minutos (o recado é anotado sempre)
  if (Date.now() - (avisados.get(chave) || 0) < 3 * 60 * 1000) return;
  if (avisados.size > 2000) avisados.clear();
  avisados.set(chave, Date.now());
  await msg.reply({
    embeds: [UI.painel({
      trilha: ['Sub dona'],
      titulo: 'O pai está ausente',
      descricao: `${aus.motivo ? `${aus.motivo}\n` : ''}${aus.ate ? `Volta ${quando(aus.ate)}.\n` : ''}Eu sou a sub dona e anotei o seu recado. Se for urgente, chame a staff.`,
    })],
    ...SEM_PING,
  }).catch(() => {});
}

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, msg) {
    try {
      if (!msg.guild || !msg.author || msg.author.bot || msg.webhookId || msg.system) return;
      if (B.esta(msg.author.id)) return; // blacklist: silêncio total
      if (!N.ativo()) return; // modo sub dona desligado pelo pai

      await avisoAusencia(client, msg);

      if (!(await Conversa.chamouAtlas(client, msg))) return;
      const bruto = String(msg.content || '').replace(/<@!?\d+>/g, ' ').replace(/\batlas\b[\s,:;!.-]*/i, ' ').replace(/\s+/g, ' ').trim();
      if (!Interp.parece(bruto)) return;
      if (!(await N.podeMandar(client, msg.author.id))) return; // quem não manda segue para a conversa normal

      const eu = client.user.id;
      let usuarios = [...msg.mentions.users.keys()].filter((id) => id !== eu);
      const entendi = Interp.entender({
        bruto,
        usuarios,
        cargos: [...msg.mentions.roles.keys()],
        canais: [...msg.mentions.channels.keys()],
      });
      if (!entendi) {
        return void msg.reply({ ...UI.nota('Entendi que é uma ordem, mas faltou detalhe. Exemplo: `atlas, silencia @fulano 10 min spam`.', 'aviso', { publica: true }), ...SEM_PING });
      }

      // Respondendo a uma mensagem sem marcar ninguém: o alvo é o autor dela
      if (!entendi.alvo && msg.reference && msg.reference.messageId && !['limpar', 'trancar', 'destrancar', 'lento', 'anunciar'].includes(entendi.acao)) {
        const ref = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
        if (ref && !ref.author.bot) entendi.alvo = ref.author.id;
      }
      if (entendi.alvo === eu) entendi.alvo = null;
      const { acao, canal, ...params } = entendi;
      params.canalAlvo = canal ? msg.guild.channels.cache.get(canal) : undefined;

      const ctx = { client, guild: msg.guild, canal: msg.channel, executor: msg.member, executorUser: msg.author, msgId: msg.id };
      const { payload } = await Ordem.pedir(ctx, acao, params);
      await msg.reply({ ...payload, ...SEM_PING });
    } catch (erro) {
      console.error('[Sub dona] mensagem:', erro);
    }
  },
};
