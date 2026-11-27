const db = require('../db');
const N = require('./nucleo');

const RAIZES = ['config.subdona', 'config.conversa', 'subdona.rotinas', 'subdona.rotinas_n'];
const PERIGOSAS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_BYTES = 300 * 1024;
const SEMANA = 7 * 24 * 3600 * 1000;

const copia = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

function exportar() {
  const dados = {};
  for (const k of RAIZES) { const v = copia(db.get(k, undefined)); if (v !== undefined) dados[k] = v; }
  return { atlas: 'backup', versao: 1, em: Date.now(), dados };
}

function limpo(v, nivel = 0) {
  if (nivel > 12) return false;
  if (Array.isArray(v)) return v.every((x) => limpo(x, nivel + 1));
  if (v && typeof v === 'object') return Object.keys(v).every((k) => !PERIGOSAS.has(k) && limpo(v[k], nivel + 1));
  return true;
}
function validar(texto) {
  if (Buffer.byteLength(texto) > MAX_BYTES) return { erro: 'O arquivo é grande demais para ser um backup da Atlas.' };
  let j;
  try { j = JSON.parse(texto); } catch { return { erro: 'Esse arquivo não é um JSON válido.' }; }
  if (!j || j.atlas !== 'backup' || j.versao !== 1 || !j.dados || typeof j.dados !== 'object') return { erro: 'Esse arquivo não parece um backup da Atlas.' };
  const chaves = Object.keys(j.dados);
  if (!chaves.length || chaves.some((k) => !RAIZES.includes(k))) return { erro: 'O backup tem chaves que eu não reconheço.' };
  if (!limpo(j.dados)) return { erro: 'O backup tem conteúdo suspeito. Recusei.' };
  return { backup: j };
}

function guardar(rotulo) {
  const l = db.get('subdona.backups', []) || [];
  l.push({ ...exportar(), rotulo });
  db.set('subdona.backups', l.slice(-3));
}
const guardados = () => db.get('subdona.backups', []) || [];

function restaurar(backup) {
  guardar('antes de restaurar');
  for (const k of RAIZES) {
    if (k in backup.dados) db.set(k, copia(backup.dados[k]));
  }
  return Object.keys(backup.dados).length;
}

function resumoDe(backup) {
  const d = backup.dados;
  const rot = Array.isArray(d['subdona.rotinas']) ? d['subdona.rotinas'].length : 0;
  const pod = Object.keys((d['config.subdona'] || {}).poderes || {}).length;
  return `Feito em <t:${Math.floor(backup.em / 1000)}:f>\n${rot} rotina(s)  ·  ${pod} poder(es) ajustado(s)  ·  ${d['config.conversa'] ? 'conversa incluída' : 'sem conversa'}`;
}

function tick() {
  if (!N.cfg('backup_auto', false)) return;
  const ult = guardados().slice(-1)[0];
  if (!ult || Date.now() - ult.em > SEMANA) guardar('automático');
}

module.exports = { exportar, validar, restaurar, guardar, guardados, resumoDe, tick };
