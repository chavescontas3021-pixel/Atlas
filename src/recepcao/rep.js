const db = require('../db');

const cargoId = (k) => db.get(`config.recepcao.cargos.${k}`, null);
const temCargo = (membro, k) => {
  const id = cargoId(k);
  return !!id && membro.roles.cache.has(id);
};

const repConfigurado = () => !!(cargoId('repParceria') || cargoId('repAlianca'));

const temRep = (membro) => temCargo(membro, 'repParceria') || temCargo(membro, 'repAlianca');

const soRep = (membro) => temRep(membro) && !temCargo(membro, 'semVaga') && !temCargo(membro, 'verificado');

async function uidSoRep(guild, uid) {
  const membro = guild.members.cache.get(uid) || (await guild.members.fetch(uid).catch(() => null));
  return membro ? soRep(membro) : false;
}

const iniciando = new Set();
async function talvezIniciar(membro) {
  if (membro.user.bot) return false;
  if (!db.get('config.recepcao.ativo', false)) return false;
  if (temCargo(membro, 'verificado')) return false;
  if (db.get(`recepcao.sessoes.${membro.id}`)) return false;
  if (db.get(`recepcao.reps.${membro.id}`)) return false;
  if (db.get(`recepcao.dispensados.${membro.id}`)) return false;
  if (soRep(membro)) return false;
  if (cargoId('semVaga') && !temCargo(membro, 'semVaga')) return false;
  if (iniciando.has(membro.id)) return false;
  iniciando.add(membro.id);
  try {
    const F = require('./fluxo');
    await F.iniciarRecepcao(membro);
    return true;
  } finally {
    iniciando.delete(membro.id);
  }
}

module.exports = { cargoId, temCargo, repConfigurado, temRep, soRep, uidSoRep, talvezIniciar };
