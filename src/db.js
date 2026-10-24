const fs = require('fs');
const path = require('path');

const pasta = path.join(__dirname, '..', 'data');
const arquivo = path.join(pasta, 'db.json');

if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

let dados = {};
if (fs.existsSync(arquivo)) {
  try {
    dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  } catch (e) {
    console.error('[DB] Arquivo corrompido, começando vazio.', e);
    dados = {};
  }
}

let salvando = null;
function salvar() {
  // Agrupa várias gravações seguidas em uma só
  if (salvando) return;
  salvando = setTimeout(() => {
    salvando = null;
    const temp = arquivo + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(dados, null, 2));
    fs.renameSync(temp, arquivo);
  }, 300);
}

// get('config.recepcao.canal', padrao)
function get(chave, padrao = undefined) {
  const partes = chave.split('.');
  let atual = dados;
  for (const p of partes) {
    if (atual === undefined || atual === null) return padrao;
    atual = atual[p];
  }
  return atual === undefined ? padrao : atual;
}

function set(chave, valor) {
  const partes = chave.split('.');
  let atual = dados;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof atual[partes[i]] !== 'object' || atual[partes[i]] === null) {
      atual[partes[i]] = {};
    }
    atual = atual[partes[i]];
  }
  atual[partes[partes.length - 1]] = valor;
  salvar();
}

function remover(chave) {
  const partes = chave.split('.');
  let atual = dados;
  for (let i = 0; i < partes.length - 1; i++) {
    if (!atual[partes[i]]) return;
    atual = atual[partes[i]];
  }
  delete atual[partes[partes.length - 1]];
  salvar();
}

module.exports = { get, set, remover };
