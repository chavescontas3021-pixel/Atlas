const N = require('../subdona/nucleo');
const Interp = require('../subdona/interprete');
const Ordem = require('../subdona/ordem');
const B = require('../blacklist/nucleo');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');

const SEM_PING = { allowedMentions: { repliedUser: false, parse: [] } };
const avisados = new Map();

function chamouAtlas(client, msg) {
  if (msg.mentions && msg.mentions.users && msg.mentions.users.has(client.user.id) && !msg.mentions.everyone) return true;
  return /^\s*(?:(?:oi|ola|olá|ei|eae|e ai|e aí|hey|opa|fala|salve|bom dia|boa tarde|boa noite)[\s,]+)?atlas\b/i.test(msg.content || '');
}

async function avisoAusencia(client, msg) {
  const aus = N.ausencia();
  if (!aus || msg.author.bot) return;
  const responsavel = await N.responsavelId(client);
  if (!responsavel || msg.author.id === responsavel) return;
  const marcouResponsavel = msg.mentions.users.has(responsavel) || (msg.mentions.repliedUser && msg.mentions.repliedUser.id === responsavel);
  const f = String(msg.content || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const chamouAtlas = msg.mentions.users.has(client.user.id) || /\batlas\b/.test(f);
  const perguntou = chamouAtlas && /\b(dono|dona|responsavel)\b/.test(f) && /\b(cade|onde|esta|ta|volta|vem|responde|fala|sumiu|online|ausente|fora)\b/.test(f);
  if (!marcouResponsavel && !perguntou) return;

  N.anotarRecado({ de: msg.author.id, canalId: msg.channelId, guildId: msg.guildId, msgId: msg.id, texto: msg.content.replace(/<@!?\d+>/g, '').trim() || '(só marcou você)' });
  const chave = `${msg.channelId}:${msg.author.id}`;
  if (Date.now() - (avisados.get(chave) || 0) < 3 * 60 * 1000) return;
  if (avisados.size > 2000) avisados.clear();
  avisados.set(chave, Date.now());
  require('../subdona/resumo').entregar(client, {
    embeds: [UI.painel({ trilha: ['Sub dona', 'Recado'], titulo: 'Alguém te procurou', descricao: `<@${msg.author.id}> em <#${msg.channelId}>\n${S.filho} ${String(msg.content || '').replace(/<@!?\d+>/g, '').trim().slice(0, 300) || '(só marcou você)'}\n[ir à mensagem](${msg.url || `https://discord.com/channels/${msg.guildId}/${msg.channelId}/${msg.id}`})` })],
    allowedMentions: { parse: [] },
  }).catch(() => {});
  await msg.reply({
    embeds: [UI.painel({
      trilha: ['Sub dona'],
      titulo: 'O responsável está ausente',
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
      if (B.esta(msg.author.id)) return;
      if (!N.ativo()) return;

      await avisoAusencia(client, msg);

      if (!chamouAtlas(client, msg)) return;
      const bruto = String(msg.content || '').replace(/<@!?\d+>/g, ' ').replace(/\batlas\b[\s,:;!.-]*/i, ' ').replace(/\s+/g, ' ').trim();
      if (!Interp.parece(bruto)) return;
      if (!(await N.podeMandar(client, msg.author.id))) return;

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
