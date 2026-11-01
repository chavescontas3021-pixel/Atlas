// Alta disponibilidade: um servidor PRINCIPAL (ex.: Termux) e um RESERVA (servidor gratuito).
// Só um dos dois fica conectado ao Discord por vez. A "trava" e o banco ficam num repositório PRIVADO do GitHub.
//
//   .env  MODO=principal | reserva      (vazio = desligado: o bot funciona como sempre)
//         REPO_DADOS=usuario/atlas-dados  (repositório PRIVADO, criado com um README)
//         GITHUB_TOKEN_DADOS=...          (opcional; se faltar, usa o GITHUB_TOKEN)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const MODO = String(process.env.MODO || '').trim().toLowerCase();
const REPO = process.env.REPO_DADOS;
const TOKEN = process.env.GITHUB_TOKEN_DADOS || process.env.GITHUB_TOKEN;
const API = 'https://api.github.com';
const RAMO_BANCO = 'banco'; // ramo só com o banco (sem histórico, para o repositório não crescer)
const ARQ_TRAVA = 'trava.json'; // fica no ramo principal do repositório
const ARQ_BANCO = 'db.json.gz';

const PASTA = path.join(__dirname, '..', '..', 'data');
const ARQ_DB = path.join(PASTA, 'db.json');

// ===== MUDE AQUI (em milissegundos) =====
const T = {
  batida: 30 * 1000, // de quanto em quanto tempo o dono renova a trava
  validade: 90 * 1000, // dono que não consegue renovar por esse tempo se desliga sozinho
  tomada: 150 * 1000, // o outro só assume depois de ver a trava parada por esse tempo (maior que "validade")
  banco: 5 * 60 * 1000, // intervalo mínimo entre envios do banco
  espera: 10 * 1000, // checagem enquanto espera a vez
  watchdog: 10 * 1000,
};
// ========================================

const log = (...a) => console.log('[Standby]', ...a);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const hashDe = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const outroModo = () => (MODO === 'principal' ? 'reserva' : 'principal');
const agoraISO = () => new Date().toISOString();

function erroConfig(msg) {
  const e = new Error(msg);
  e.configuracao = true;
  return e;
}

function validarConfig() {
  if (!['principal', 'reserva'].includes(MODO)) throw erroConfig('MODO no .env precisa ser "principal" ou "reserva".');
  if (!REPO || !/^[\w.-]+\/[\w.-]+$/.test(REPO)) throw erroConfig('REPO_DADOS no .env precisa ser no formato usuario/repositorio.');
  if (!TOKEN) throw erroConfig('Falta GITHUB_TOKEN_DADOS (ou GITHUB_TOKEN) no .env.');
}

// ---------- GitHub ----------
function gh(caminho, opcoes = {}) {
  return fetch(API + caminho, {
    ...opcoes,
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'atlas-bot',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opcoes.headers || {}),
    },
  });
}

async function ghJson(metodo, caminho, corpo) {
  const r = await gh(caminho, { method: metodo, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${metodo} ${caminho}: erro ${r.status}`);
  return r.json();
}

// Tudo o que fala com o GitHub fica aqui (assim dá para testar a lógica sem internet)
const io = {
  async conferirRepo() {
    const r = await gh(`/repos/${REPO}`);
    if (r.status === 404 || r.status === 401 || r.status === 403) {
      throw erroConfig(`Não achei o repositório ${REPO} (ou o token não tem acesso a ele).`);
    }
    if (!r.ok) throw new Error(`conferir repositório: erro ${r.status}`);
    const j = await r.json();
    if (!j.private) throw erroConfig(`O repositório ${REPO} é PÚBLICO. O banco tem dados dos membros: torne-o privado.`);
  },

  async lerTrava() {
    const r = await gh(`/repos/${REPO}/contents/${ARQ_TRAVA}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`ler trava: erro ${r.status}`);
    const j = await r.json();
    return { sha: j.sha, dados: JSON.parse(Buffer.from(j.content || '', 'base64').toString('utf8')) };
  },

  // true = gravou; false = alguém gravou antes de nós (conflito)
  async gravarTrava(dados, sha) {
    const corpo = {
      message: `trava: ${dados.dono} n=${dados.n}`,
      content: Buffer.from(JSON.stringify(dados)).toString('base64'),
      ...(sha ? { sha } : {}),
    };
    const r = await gh(`/repos/${REPO}/contents/${ARQ_TRAVA}`, { method: 'PUT', body: JSON.stringify(corpo) });
    if (r.status === 409 || r.status === 422) return false;
    if (!r.ok) throw new Error(`gravar trava: erro ${r.status}`);
    return true;
  },

  // Envia o banco local (compactado) como um commit novo e sem histórico no ramo "banco"
  async subirBanco(origem) {
    const bruto = lerBancoLocal();
    if (!bruto) return null;
    const gz = zlib.gzipSync(bruto);
    if (gz.length > 50 * 1024 * 1024) throw new Error('o banco compactado passou de 50 MB');
    const blob = await ghJson('POST', `/repos/${REPO}/git/blobs`, { content: gz.toString('base64'), encoding: 'base64' });
    const arvore = await ghJson('POST', `/repos/${REPO}/git/trees`, { tree: [{ path: ARQ_BANCO, mode: '100644', type: 'blob', sha: blob.sha }] });
    const commit = await ghJson('POST', `/repos/${REPO}/git/commits`, { message: `banco (${origem})`, tree: arvore.sha, parents: [] });
    let r = await gh(`/repos/${REPO}/git/refs/heads/${RAMO_BANCO}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: true }) });
    if (r.status === 404 || r.status === 422) {
      r = await gh(`/repos/${REPO}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${RAMO_BANCO}`, sha: commit.sha }) });
    }
    if (!r.ok) throw new Error(`atualizar o ramo do banco: erro ${r.status}`);
    return hashDe(bruto);
  },

  async baixarBanco() {
    const r = await gh(`/repos/${REPO}/contents/${ARQ_BANCO}?ref=${RAMO_BANCO}`, { headers: { Accept: 'application/vnd.github.raw+json' } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`baixar banco: erro ${r.status}`);
    return zlib.gunzipSync(Buffer.from(await r.arrayBuffer()));
  },

  sair(motivo) {
    log(`desligando: ${motivo}`);
    process.exit(0);
  },
};

// ---------- Banco local ----------
function lerBancoLocal() {
  try {
    return fs.readFileSync(ARQ_DB);
  } catch {
    return null;
  }
}

function guardarBanco(buf) {
  JSON.parse(buf.toString('utf8')); // confere antes de sobrescrever
  fs.mkdirSync(PASTA, { recursive: true });
  if (fs.existsSync(ARQ_DB)) {
    // Guarda o banco antigo como backup (os 5 mais recentes)
    const carimbo = agoraISO().replace(/[-:T]/g, '').slice(0, 14);
    fs.copyFileSync(ARQ_DB, path.join(PASTA, `db.backup-${carimbo}.json`));
    const antigos = fs.readdirSync(PASTA).filter((f) => /^db\.backup-\d+\.json$/.test(f)).sort();
    for (const f of antigos.slice(0, Math.max(0, antigos.length - 5))) fs.unlinkSync(path.join(PASTA, f));
  }
  const temp = `${ARQ_DB}.tmp`;
  fs.writeFileSync(temp, buf);
  fs.renameSync(temp, ARQ_DB);
}

async function trazerBanco() {
  const buf = await io.baixarBanco();
  if (!buf) {
    log('nenhum banco no repositório ainda; mantendo o banco local');
    return false;
  }
  guardarBanco(buf);
  log('banco mais recente baixado do repositório');
  return true;
}

// ---------- Esperar a vez (roda ANTES de carregar o bot) ----------
const ativo = () => MODO !== '';

async function tentarAssumir(t, visto, avisa) {
  const agora = Date.now();
  const d = t ? t.dados : { dono: 'livre', n: 0, devolver: false, dbDe: null };
  const sha = t ? t.sha : undefined;

  // Anota quando a trava mexeu pela última vez (usa só o relógio daqui, sem depender do relógio do outro)
  if (visto.n !== d.n || visto.dono !== d.dono) {
    visto.n = d.n;
    visto.dono = d.dono;
    visto.em = agora;
  }
  const parada = agora - visto.em >= T.tomada;

  let pode = false;
  if (MODO === 'principal') {
    pode = d.dono !== 'reserva' || parada;
    if (!pode) {
      // O reserva está no ar: pede a vaga de volta e espera ele devolver
      if (!d.devolver) await io.gravarTrava({ ...d, devolver: true }, sha);
      avisa('o reserva está ativo; pedi para ele devolver e estou esperando...');
      return false;
    }
  } else {
    pode = d.dono === 'reserva' || parada;
    if (!pode) {
      avisa(`o principal está ativo (batida ${d.n}); ficando de reserva...`);
      return false;
    }
  }

  // O banco do outro é mais novo? (ou não existe banco aqui)
  const precisaBanco = d.dbDe === outroModo() || !lerBancoLocal();
  if (precisaBanco) await trazerBanco();

  const novo = {
    dono: MODO,
    n: d.n + 1,
    devolver: MODO === 'reserva' && d.dono === 'reserva' ? !!d.devolver : false,
    dbDe: d.dbDe || null,
    atualizadoEm: agoraISO(),
  };
  const ok = await io.gravarTrava(novo, sha);
  if (!ok) return false; // alguém chegou antes; tenta de novo
  log(`assumi a trava como ${MODO}`);
  return true;
}

async function aguardarVez() {
  validarConfig();
  log(`modo ${MODO}`);
  const visto = { n: null, dono: null, em: Date.now() };
  let ultimoAviso = '';
  const avisa = (msg) => {
    if (msg !== ultimoAviso) {
      ultimoAviso = msg;
      log(msg);
    }
  };
  let repoOk = false;
  for (;;) {
    try {
      if (!repoOk) {
        await io.conferirRepo();
        repoOk = true;
      }
      const t = await io.lerTrava();
      if (await tentarAssumir(t, visto, avisa)) return;
    } catch (e) {
      if (e.configuracao) throw e;
      avisa(`sem acesso ao GitHub (${e.message}); tentando de novo...`);
    }
    await dormir(T.espera);
  }
}

// ---------- Depois de ligar: renovar a trava e guardar o banco ----------
function manter(client) {
  const meu = MODO;
  let ultimaRenovacao = Date.now();
  let ultimoEnvio = 0;
  let ultimoHash = null;
  let dbPendente = false; // enviou o banco mas ainda não marcou "dbDe" na trava
  let ocupado = false;
  let saindo = false;

  const parar = () => {
    try {
      client.destroy();
    } catch { /* já estava desligado */ }
  };
  const sair = (motivo) => {
    if (saindo) return;
    saindo = true;
    parar();
    io.sair(motivo);
  };

  function esvaziarMemoria() {
    try {
      require('../stats/nucleo').flush();
    } catch { /* sem estatísticas */ }
  }

  // Desliga o bot e deixa o banco final no repositório (só se a trava ainda for nossa)
  async function fecharComBanco(liberar) {
    parar();
    await dormir(800); // o db.js grava com um pequeno atraso
    esvaziarMemoria();
    await dormir(800);
    for (let i = 0; i < 3; i++) {
      try {
        const t = await io.lerTrava();
        if (!t || t.dados.dono !== meu) return;
        await io.subirBanco(meu);
        const novo = { ...t.dados, dbDe: meu, n: t.dados.n + 1, atualizadoEm: agoraISO(), ...(liberar ? { dono: 'livre', devolver: false } : {}) };
        if (await io.gravarTrava(novo, t.sha)) return;
      } catch (e) {
        log(`falha ao enviar o banco final: ${e.message}`);
        await dormir(3000);
      }
    }
  }

  async function batida() {
    if (ocupado || saindo) return;
    ocupado = true;
    try {
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const t = await io.lerTrava();
        if (!t || t.dados.dono !== meu) {
          sair(`a trava passou para "${t ? t.dados.dono : 'ninguém'}"`);
          return;
        }
        const d = t.dados;

        if (meu === 'reserva' && d.devolver) {
          saindo = true;
          log('o principal pediu a vaga de volta; enviando o banco final...');
          await fecharComBanco(true);
          io.sair('vaga devolvida ao principal');
          return;
        }

        const novo = { ...d, n: d.n + 1, atualizadoEm: agoraISO() };

        // Envia o banco se mudou (no máximo a cada T.banco)
        const bruto = lerBancoLocal();
        if (bruto && hashDe(bruto) !== ultimoHash && Date.now() - ultimoEnvio >= T.banco) {
          try {
            const h = await io.subirBanco(meu);
            if (h) {
              ultimoHash = h;
              ultimoEnvio = Date.now();
              dbPendente = true;
            }
          } catch (e) {
            log(`não consegui enviar o banco: ${e.message}`);
          }
        }
        if (dbPendente) novo.dbDe = meu;

        if (await io.gravarTrava(novo, t.sha)) {
          dbPendente = false;
          ultimaRenovacao = Date.now();
          return;
        }
        // conflito: alguém gravou no meio; lê de novo e decide
      }
    } catch (e) {
      log(`batida falhou: ${e.message}`);
    } finally {
      ocupado = false;
    }
  }

  setInterval(batida, T.batida);
  setInterval(() => {
    if (!saindo && Date.now() - ultimaRenovacao > T.validade) {
      sair(`sem conseguir renovar a trava há ${Math.round(T.validade / 1000)}s`);
    }
  }, T.watchdog);
  batida();

  // Ctrl+C / parada normal: deixa o banco salvo no repositório antes de fechar
  for (const sinal of ['SIGINT', 'SIGTERM']) {
    process.once(sinal, async () => {
      if (saindo) return;
      saindo = true;
      log(`${sinal}: salvando o banco antes de fechar...`);
      await Promise.race([fecharComBanco(meu === 'reserva'), dormir(25000)]);
      process.exit(0);
    });
  }
  log('batimento iniciado');
}

module.exports = { ativo, aguardarVez, manter, _teste: { io, T, tentarAssumir, ARQ_DB } };
