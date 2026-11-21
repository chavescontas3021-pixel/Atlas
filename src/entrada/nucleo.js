// ATLAS · entrada controlada: a Atlas só fica em servidor onde o DONO está (só ele a convida)
const db = require('../db');
const Modo = require('../modo/nucleo');

const aprovados = () => db.get('entrada.aprovados', []) || [];
const aprovar = (id) => { const l = aprovados(); if (!l.includes(id)) { l.push(id); db.set('entrada.aprovados', l); } };

// true = pode ficar. Só dá "não" com certeza (dono não é membro); erro de rede não expulsa ninguém.
async function pode(client, guild) {
  const dono = await Modo.donoId(client);
  if (!dono) return true;
  if (aprovados().includes(guild.id)) return true;
  try { await guild.members.fetch(dono); aprovar(guild.id); return true; }
  catch (e) { if (e && (e.code === 10007 || e.code === 10013)) return false; console.error('[Entrada] não consegui conferir', guild.name, e && e.message); return true; }
}

async function avisarDono(client, texto) {
  const id = await Modo.donoId(client); if (!id) return;
  try { await (await client.users.fetch(id)).send({ content: texto.slice(0, 1900), allowedMentions: { parse: [] } }); } catch { /* DM fechada */ }
}

async function sair(client, guild, motivo) {
  const nome = guild.name;
  try { await guild.leave(); console.log(`[Entrada] saí de ${nome} (${motivo})`); return true; }
  catch (e) { console.error('[Entrada] não consegui sair de', nome, e && e.message); return false; }
}

async function conferir(client, guild, { aoEntrar = false } = {}) {
  if (await pode(client, guild)) return aoEntrar ? avisarDono(client, `Entrei no servidor **${guild.name}** (${guild.memberCount} membros), onde você está.`) : undefined;
  let dono = '';
  try { const o = await guild.fetchOwner(); dono = ` O dono do servidor é ${o.user.username}.`; } catch { /* sem dono visível */ }
  await sair(client, guild, 'dono da Atlas não está no servidor');
  return avisarDono(client, `Alguém tentou me colocar em **${guild.name}** (${guild.memberCount} membros), onde você não está.${dono} Saí sozinha. Se era para eu ficar, entre no servidor e me convide de novo.`);
}

module.exports = { aprovados, aprovar, pode, sair, conferir, avisarDono };
