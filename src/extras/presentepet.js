// Presente de pet exclusivo (Dragonfox): estado entre o comando e o formulário + entrega.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const Bichos = require('./bichos');

const ESPECIE = 'dragonfox';
const pendentes = new Map(); // id de quem usou o comando -> dados do presente

const MENSAGEM_PADRAO =
  '{membro}, esse presente é só seu. 💛\n\n' +
  'Quando o Atlas ainda era só uma ideia cheia de bugs, você foi uma das primeiras pessoas a testar, apontar erros e ter paciência com ele. ' +
  'Sem a sua ajuda, o bot não seria o mesmo.\n\n' +
  'Por isso nasceu um bichinho que **ninguém mais no servidor pode ter**: um **Dragonfox**, uma raposinha com asas de dragão, o único pet ultra lendário do Atlas.\n\n' +
  'Cuide bem dele. Ele já nasceu te adorando. 🦊🐉✨';

function guardar(staffId, dados) {
  pendentes.set(staffId, { ...dados, quando: Date.now() });
}
function pegar(staffId) {
  const d = pendentes.get(staffId);
  if (!d) return null;
  if (Date.now() - d.quando > 30 * 60 * 1000) {
    pendentes.delete(staffId);
    return null;
  }
  return d;
}
const limpar = (staffId) => pendentes.delete(staffId);

// Monta o embed do presente
function embedPresente(membroId, texto) {
  return new EmbedBuilder()
    .setColor(0xffb347)
    .setTitle('🎁 Um presente muito especial!')
    .setDescription(String(texto).replace(/\{membro\}/g, `<@${membroId}>`).slice(0, 4000))
    .setImage(Bichos.anexoDe(ESPECIE).url)
    .setFooter({ text: 'Pet ultra lendário · exclusivo · veja com /pet ver' });
}

// Cria o pet do presente (não confere nada: quem chama já validou)
function criarPet(uid, nome) {
  const p = {
    especie: ESPECIE,
    nome,
    nivel: 1,
    xp: 0,
    alimentadoAte: Date.now() + 12 * 3600 * 1000,
    cdPasseio: 0,
    passeios: 0,
    adotadoEm: Date.now(),
    presente: true,
  };
  db.set(`extras.pets.${uid}`, p);
  return p;
}

module.exports = { ESPECIE, MENSAGEM_PADRAO, guardar, pegar, limpar, embedPresente, criarPet };
