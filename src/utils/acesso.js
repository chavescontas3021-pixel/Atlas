// Quem pode usar os comandos por prefixo: a mesma regra do "/".
// Comandos públicos (sem permissão exigida no Discord, como /rpg, /loja, /pet) são de todos;
// os que exigem permissão (comandos de staff) continuam só para a staff.
//
// Staff = quem tem "Gerenciar Servidor" ou "Administrador", OU quem tem algum cargo
// listado em STAFF_ROLE_IDS no .env (IDs separados por vírgula).
const { PermissionFlagsBits } = require('discord.js');

// Comandos que qualquer membro pode usar. Ajuste essa lista como quiser.
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

// publico = o comando não exige permissão no Discord (qualquer membro usa pelo "/")
const podeUsar = (nomeComando, membro, publico = false) => publico || LIBERADOS.has(nomeComando) || ehStaff(membro);

const MSG_NEGADO = '❌ Esse comando é só para a staff.';

module.exports = { ehStaff, podeUsar, LIBERADOS, MSG_NEGADO };
