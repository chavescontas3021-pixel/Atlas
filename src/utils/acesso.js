// Quem pode usar os comandos: só a staff, exceto os comandos liberados abaixo.
//
// Staff = quem tem "Gerenciar Servidor" ou "Administrador", OU quem tem algum cargo
// listado em STAFF_ROLE_IDS no .env (IDs separados por vírgula).
const { PermissionFlagsBits } = require('discord.js');

// Comandos que qualquer membro pode usar. Ajuste essa lista como quiser.
const LIBERADOS = new Set(['formulario', 'ticket', 'ping', 'comandos']);

const cargosStaff = () =>
  (process.env.STAFF_ROLE_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

function ehStaff(membro) {
  if (!membro) return false;
  const perms = membro.permissions;
  if (perms && (perms.has(PermissionFlagsBits.Administrator) || perms.has(PermissionFlagsBits.ManageGuild))) return true;
  const ids = cargosStaff();
  return ids.length > 0 && membro.roles && ids.some((id) => membro.roles.cache.has(id));
}

const podeUsar = (nomeComando, membro) => LIBERADOS.has(nomeComando) || ehStaff(membro);

const MSG_NEGADO = '❌ Esse comando é só para a staff.';

module.exports = { ehStaff, podeUsar, LIBERADOS, MSG_NEGADO };
