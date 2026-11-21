// ATLAS · modo administrativo: desligado, só os comandos de construção e os pessoais funcionam.
const db = require('../db');

// Sempre liberados, com o modo administrativo ligado ou não
const LIVRES = new Set(['modo', 'decorar', 'criar', 'cargo', 'forms', 'ajuda']);
// Só o dono usa (dados privados dele)
const PESSOAIS = new Set(['lembrete', 'nota', 'tarefa', 'pessoal']);

const admin = () => db.get('modo.admin', false) === true;
const setAdmin = (v) => db.set('modo.admin', Boolean(v));

async function donoId(client) {
  try { return await require('../subdona/nucleo').paiId(client); } catch { /* sem sub dona: usa o dono do aplicativo */ }
  try {
    const app = await client.application.fetch();
    const o = app.owner;
    return o && o.members ? (o.members.find((m) => m.role === 'admin') || o.members.first() || {}).id : o && o.id;
  } catch { return null; }
}
const ehDono = async (client, uid) => { const d = await donoId(client); return Boolean(d) && String(d) === String(uid); };

// null = pode; texto = recusa
async function checar(client, interaction) {
  const nome = interaction.commandName;
  if (PESSOAIS.has(nome)) return (await ehDono(client, interaction.user.id)) ? null : '🔒 Este comando é só do dono.';
  if (LIVRES.has(nome) || admin()) return null;
  return '🔒 O **modo administrativo** está desligado. O dono liga com `/modo administrativo`.';
}

module.exports = { LIVRES, PESSOAIS, admin, setAdmin, donoId, ehDono, checar };
