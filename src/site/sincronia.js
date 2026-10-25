// Ponte entre o bot e o site, usando um ramo "dados" do seu repositório no GitHub.
//   estado.json  -> o bot publica a configuração atual (o site lê)
//   pedido.json  -> o site publica as mudanças (o bot lê, valida e aplica)
const crypto = require('crypto');
const db = require('../db');
const campos = require('./campos');

const REPO = process.env.GITHUB_REPO || 'chavescontas3021-pixel/Atlas';
const RAMO = 'dados';
const API = 'https://api.github.com';

const info = { ultimoCiclo: null, erro: null, ultimoHash: '', ramoOk: false, ocupado: false };

const token = () => process.env.GITHUB_TOKEN;

function urlDoSite() {
  const [dono, nome] = REPO.split('/');
  return `https://${dono}.github.io/${nome}/`;
}

async function gh(caminho, opcoes = {}) {
  return fetch(API + caminho, {
    ...opcoes,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'atlas-bot',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opcoes.headers || {}),
    },
  });
}

async function garantirRamo() {
  let r = await gh(`/repos/${REPO}/git/ref/heads/${RAMO}`);
  if (r.status === 200) return;
  if (r.status === 401 || r.status === 403) throw new Error('Token do GitHub inválido ou sem permissão (Contents: Read and write).');
  const principal = await gh(`/repos/${REPO}/git/ref/heads/main`);
  if (!principal.ok) throw new Error(`Não achei o ramo main (${principal.status}). Confira GITHUB_REPO.`);
  const sha = (await principal.json()).object.sha;
  r = await gh(`/repos/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${RAMO}`, sha }) });
  if (!r.ok) throw new Error(`Não consegui criar o ramo "${RAMO}" (${r.status}).`);
}

async function ler(nome) {
  const r = await gh(`/repos/${REPO}/contents/${nome}?ref=${RAMO}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`Ler ${nome}: erro ${r.status}`);
  const j = await r.json();
  let dados = null;
  try {
    dados = JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8'));
  } catch { /* arquivo inválido: ignora */ }
  return { sha: j.sha, dados };
}

async function gravar(nome, dados, sha, mensagem) {
  const corpo = {
    message: mensagem,
    branch: RAMO,
    content: Buffer.from(JSON.stringify(dados)).toString('base64'),
    ...(sha ? { sha } : {}),
  };
  const r = await gh(`/repos/${REPO}/contents/${nome}`, { method: 'PUT', body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`Gravar ${nome}: erro ${r.status}`);
}

async function ciclo(client) {
  if (!token()) return { ignorado: true };
  if (info.ocupado) return { ignorado: true };
  info.ocupado = true;
  try {
    const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
    if (!guild) throw new Error('O bot não está em nenhum servidor.');
    if (!info.ramoOk) {
      await garantirRamo();
      info.ramoOk = true;
    }

    let resultado = db.get('site.resultado', null);
    const pedido = await ler('pedido.json');
    if (pedido && pedido.dados && pedido.dados.id && String(pedido.dados.id) !== db.get('site.ultimoPedido', null)) {
      resultado = campos.processarPedido(pedido.dados, guild);
      db.set('site.ultimoPedido', String(pedido.dados.id));
      db.set('site.resultado', resultado);
      console.log(`[Site] pedido ${resultado.id}: ${resultado.ok.length} aplicado(s), ${resultado.erros.length} erro(s)`);
    }

    const estado = campos.montarEstado(guild, resultado);
    const hash = crypto.createHash('sha1').update(JSON.stringify(estado)).digest('hex');
    if (hash !== info.ultimoHash) {
      const atual = await ler('estado.json');
      await gravar('estado.json', { ...estado, atualizadoEm: new Date().toISOString() }, atual && atual.sha, 'Atlas: atualiza estado');
      info.ultimoHash = hash;
    }
    info.erro = null;
    info.ultimoCiclo = Date.now();
    return { ok: true };
  } catch (e) {
    info.erro = e.message;
    console.error('[Site]', e.message);
    return { erro: e.message };
  } finally {
    info.ocupado = false;
  }
}

module.exports = { ciclo, info, urlDoSite, REPO };
