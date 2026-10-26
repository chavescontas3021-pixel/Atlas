// Ajudantes para mexer nas stars do RPG (precisa ter personagem de RPG).
const R = require('../rpg/nucleo');

const SEM_RPG = 'Você precisa de um personagem de RPG para isso. Use `/rpg criar` primeiro! 💜';

const saldo = (uid) => {
  const j = R.obter(uid);
  return j ? j.moedas : null;
};

// { erro } ou { ok, j }
function gastar(uid, valor) {
  const j = R.obter(uid);
  if (!j) return { erro: SEM_RPG };
  if (j.moedas < valor) return { erro: `Você precisa de ⭐ **${valor}** stars e tem ⭐ ${j.moedas}.` };
  j.moedas -= valor;
  R.salvar(uid, j);
  return { ok: true, j };
}

function ganhar(uid, valor) {
  const j = R.obter(uid);
  if (!j) return { erro: SEM_RPG };
  j.moedas += valor;
  R.salvar(uid, j);
  return { ok: true, j };
}

module.exports = { SEM_RPG, saldo, gastar, ganhar };
