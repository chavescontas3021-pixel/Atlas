const db = require('../db');
const N = require('./nucleo');
const C = require('../construir/nucleo');

const BACKUP = 'decorar.backupCargos';

const decoraveis = (guild) => [...guild.roles.cache.values()].filter((r) => r.id !== guild.id && !r.managed).sort((a, b) => b.position - a.position);
const montarLista = (guild) => { const r = decoraveis(guild); return { linhas: r.map((x) => `${x.id} | ${x.name}`), total: r.length }; };

function interpretar(guild, texto) {
  const pedidos = N.lerLinhas(texto);
  const mudancas = []; const problemas = []; let iguais = 0;
  for (const [id, nome] of pedidos) {
    const r = guild.roles.cache.get(id);
    if (!r) { problemas.push({ nome: id, motivo: 'cargo não encontrado' }); continue; }
    if (r.id === guild.id || r.managed) { problemas.push({ nome: r.name, motivo: 'esse cargo não pode ser renomeado' }); continue; }
    const tam = [...nome].length;
    if (tam < 1) { problemas.push({ nome: r.name, motivo: 'sem nome depois do |' }); continue; }
    if (tam > 100) { problemas.push({ nome: r.name, motivo: `nome com ${tam} caracteres (máximo 100)` }); continue; }
    if (nome === r.name) { iguais++; continue; }
    if (!r.editable) { problemas.push({ nome: r.name, motivo: 'o cargo está acima do da Atlas' }); continue; }
    mudancas.push({ id, antes: r.name, depois: nome });
  }
  return { mudancas, iguais, problemas, lidas: pedidos.size };
}

async function renomear(guild, mudancas, { motivo, aoProgredir } = {}) {
  const ok = []; const falhas = []; let i = 0;
  for (const m of mudancas) {
    i++;
    const r = guild.roles.cache.get(m.id);
    if (!r) falhas.push({ ...m, erro: 'o cargo não existe mais' });
    else if (r.name === m.depois) ok.push(m);
    else { try { await C.comLimite(r.setName(m.depois, motivo), 20000); ok.push(m); } catch (e) { falhas.push({ ...m, erro: C.motivoErro(e) }); } }
    if (aoProgredir) { try { await aoProgredir(i, mudancas.length); } catch {} }
    await C.dormir(600);
  }
  return { ok, falhas };
}

function guardarBackup(mudancas) {
  const b = db.get(BACKUP, {}) || {};
  for (const m of mudancas) if (!b[m.id]) b[m.id] = { original: m.antes, em: Date.now() };
  db.set(BACKUP, b);
}
function prepararDesfazer(guild) {
  const b = db.get(BACKUP, {}) || {}; const mudancas = []; const resolvidos = [];
  for (const [id, info] of Object.entries(b)) {
    const r = guild.roles.cache.get(id);
    if (!r || r.name === info.original) resolvidos.push(id); else mudancas.push({ id, antes: r.name, depois: info.original });
  }
  return { mudancas, resolvidos };
}
function limparBackup(ids) { const b = db.get(BACKUP, {}) || {}; for (const id of ids) delete b[id]; db.set(BACKUP, b); }

module.exports = { montarLista, interpretar, renomear, guardarBackup, prepararDesfazer, limparBackup };
