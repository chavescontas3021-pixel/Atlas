const { PermissionFlagsBits } = require('discord.js');

const LIBERADOS = new Set(['formulario', 'parceriaficha', 'ticket', 'ping', 'comandos']);

const cargosStaff = () =>
  (process.env.STAFF_ROLE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

function ehStaff(membro) {
  if (!membro) return false;
  const perms = membro.permissions;
  if (perms && (perms.has(PermissionFlagsBits.Administrator) || perms.has(PermissionFlagsBits.ManageGuild))) return true;
  const ids = cargosStaff();
  return ids.length > 0 && membro.roles && ids.some((id) => membro.roles.cache.has(id));
}

const podeUsar = (nomeComando, membro, publico = false) => publico || LIBERADOS.has(nomeComando) || ehStaff(membro);

const MSG_NEGADO = '❌ Esse comando é só para a staff.';

module.exports = { ehStaff, podeUsar, LIBERADOS, MSG_NEGADO };
