const db = require('../db');
const { ehStaff } = require('../utils/acesso');

// Aceita menção de canal (<#123>) ou link de canal/mensagem (discord.com/channels/...)
const REGEX_CANAL = /<#\d+>|https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/\d+\/\d+/i;

const canais = () => {
  const c = db.get('config.canalmarcacao.canais', []);
  return Array.isArray(c) ? c : [];
};

const ehCanalVigiado = (canalId) => canais().includes(canalId);
const temMarcacao = (texto) => REGEX_CANAL.test(String(texto || ''));

function adicionar(canalId) {
  const lista = canais();
  if (lista.includes(canalId)) return false;
  db.set('config.canalmarcacao.canais', [...lista, canalId]);
  return true;
}

function remover(canalId) {
  const lista = canais();
  if (!lista.includes(canalId)) return false;
  db.set('config.canalmarcacao.canais', lista.filter((id) => id !== canalId));
  return true;
}

// Apaga a mensagem se não tiver marcação de canal. A staff é ignorada.
async function verificar(message) {
  if (!message.guild || !message.author || message.author.bot || message.system) return;
  if (!ehCanalVigiado(message.channel.id)) return;
  if (temMarcacao(message.content)) return;

  const membro = message.member || (await message.guild.members.fetch(message.author.id).catch(() => null));
  if (ehStaff(membro)) return;

  const autor = message.author;
  const apagou = await message
    .delete()
    .then(() => true)
    .catch((e) => {
      console.error('[CanalMarcação] não consegui apagar a mensagem:', e.message);
      return false;
    });
  if (!apagou) return;

  const aviso = await message.channel
    .send({
      content: `${autor}, aqui só vale mensagem **com marcação de canal** (ex.: #canal). Sua mensagem foi apagada.`,
      allowedMentions: { users: [autor.id] },
    })
    .catch(() => null);
  if (aviso) setTimeout(() => aviso.delete().catch(() => {}), 6000);
}

module.exports = { canais, ehCanalVigiado, temMarcacao, adicionar, remover, verificar };
