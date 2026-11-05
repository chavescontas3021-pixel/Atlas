// Vigia de convites das parcerias: guarda cada convite postado e confere de tempos em tempos
// se ele ainda funciona. Quando expira (ou é apagado), avisa a staff uma única vez.
const { EmbedBuilder } = require('discord.js');
const db = require('../db');

const COR_ERRO = 0xe74c3c;
const PAUSA = 1500; // espera entre uma checagem e outra (evita limite de requisições do Discord)
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const REGEX_CONVITE =
  /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/([A-Za-z0-9-]{2,32})/gi;

// ---------- Configuração ----------
const cfg = (chave, padrao) => db.get(`config.parceriaconvites.${chave}`, padrao);
const setCfg = (chave, valor) => db.set(`config.parceriaconvites.${chave}`, valor);

function conf() {
  const horas = Math.floor(Number(cfg('horas', 6)));
  return {
    ligado: cfg('ligado', true) !== false,
    canalAviso: cfg('canalAviso', null),
    cargoAviso: cfg('cargoAviso', null),
    horas: horas >= 1 && horas <= 72 ? horas : 6,
  };
}

// ---------- Lista de convites guardados ----------
function todos() {
  const t = db.get('parceria.convites', {});
  return t && typeof t === 'object' ? t : {};
}
const obter = (codigo) => todos()[codigo] || null;

function codigoDe(texto) {
  const m = String(texto || '').match(/(?:discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/([A-Za-z0-9-]{2,32})/i);
  if (m) return m[1];
  const solto = String(texto || '').trim();
  return /^[A-Za-z0-9-]{2,32}$/.test(solto) ? solto : null;
}

function acharTodos(texto) {
  const achados = [];
  for (const m of String(texto || '').matchAll(REGEX_CONVITE)) achados.push(m[1]);
  return [...new Set(achados)];
}

// Guarda (ou atualiza) um convite. Devolve o registro.
function registrar({ codigo, servidor, promotorId, canalId, msgId }) {
  if (!codigo) return null;
  const atual = obter(codigo) || {};
  const novo = {
    codigo,
    convite: `https://discord.gg/${codigo}`,
    servidor: servidor || atual.servidor || null,
    promotorId: promotorId || atual.promotorId || null,
    canalId: canalId || atual.canalId || null,
    msgId: msgId || atual.msgId || null,
    criadoEm: atual.criadoEm || Date.now(),
    ultimaChecagem: atual.ultimaChecagem || 0,
    quebrado: atual.quebrado === true,
    avisadoEm: atual.avisadoEm || null,
  };
  db.set(`parceria.convites.${codigo}`, novo);
  return novo;
}

const remover = (codigo) => {
  if (!obter(codigo)) return false;
  db.remover(`parceria.convites.${codigo}`);
  return true;
};

// ---------- Checagem ----------
// Devolve { estado: 'ok' | 'quebrado' | 'erro', servidor }
async function checarUm(client, codigo) {
  try {
    const inv = await client.fetchInvite(codigo);
    return { estado: 'ok', servidor: (inv && inv.guild && inv.guild.name) || null };
  } catch (e) {
    // 10006 = "Unknown Invite": o convite não existe mais. Qualquer outro erro (rede, limite) NÃO conta.
    if (e && e.code === 10006) return { estado: 'quebrado', servidor: null };
    return { estado: 'erro', servidor: null };
  }
}

// Confirma antes de dar como quebrado (uma segunda tentativa, para evitar falso alarme)
async function checarConfirmando(client, codigo) {
  let r = await checarUm(client, codigo);
  if (r.estado === 'quebrado') {
    await dormir(5000);
    r = await checarUm(client, codigo);
  }
  return r;
}

async function enviarAviso(client, c) {
  const { canalAviso, cargoAviso } = conf();
  if (!canalAviso) return false;
  const canal = await client.channels.fetch(canalAviso).catch(() => null);
  if (!canal || !canal.send) return false;

  const linhas = [
    `🌐 Servidor: **${c.servidor || 'não identificado'}**`,
    `🔗 Convite: ${c.convite}`,
    c.promotorId ? `🤝 Promotor: <@${c.promotorId}>` : null,
    c.criadoEm ? `📅 Registrado: <t:${Math.floor(c.criadoEm / 1000)}:R>` : null,
    c.canalId && c.msgId && canal.guildId
      ? `💬 [Ir para a mensagem da parceria](https://discord.com/channels/${canal.guildId}/${c.canalId}/${c.msgId})`
      : null,
    '',
    'Peça um convite novo ao representante e, depois, use `/parceriaconvites remover` para tirar este da lista.',
  ].filter((x) => x !== null);

  const embed = new EmbedBuilder()
    .setColor(COR_ERRO)
    .setTitle('⚠️ Convite de parceria quebrado')
    .setDescription(linhas.join('\n'))
    .setTimestamp();

  await canal.send({
    content: cargoAviso ? `<@&${cargoAviso}>` : undefined,
    embeds: [embed],
    allowedMentions: cargoAviso ? { roles: [cargoAviso] } : { parse: [] },
  });
  return true;
}

// Checa um convite, atualiza o registro e avisa se acabou de quebrar
async function processar(client, codigo) {
  const c = obter(codigo);
  if (!c) return null;
  const r = await checarConfirmando(client, codigo);
  if (r.estado === 'erro') return { ...c, estado: 'erro' };

  const novo = { ...c, ultimaChecagem: Date.now() };
  if (r.servidor) novo.servidor = r.servidor;
  if (r.estado === 'ok') {
    novo.quebrado = false;
    novo.avisadoEm = null; // se quebrar de novo no futuro, avisa de novo
  } else {
    novo.quebrado = true;
    if (!novo.avisadoEm) {
      const enviou = await enviarAviso(client, novo).catch((e) => {
        console.error('[Convites] erro ao avisar:', e.message);
        return false;
      });
      if (enviou) novo.avisadoEm = Date.now();
    }
  }
  db.set(`parceria.convites.${codigo}`, novo);
  return { ...novo, estado: r.estado };
}

// Rotina automática: só checa quem já passou do intervalo
let rodando = false;
async function tick(client) {
  const c = conf();
  if (!c.ligado || rodando) return;
  rodando = true;
  try {
    const limite = Date.now() - c.horas * 3600 * 1000;
    const vencidos = Object.values(todos()).filter((x) => (x.ultimaChecagem || 0) <= limite);
    for (const item of vencidos) {
      await processar(client, item.codigo);
      await dormir(PAUSA);
    }
  } finally {
    rodando = false;
  }
}

// Checa tudo agora (comando /parceriaconvites verificar)
async function verificarTodos(client) {
  const resumo = { ok: 0, quebrados: [], erros: 0, total: 0 };
  for (const item of Object.values(todos())) {
    const r = await processar(client, item.codigo);
    resumo.total++;
    if (!r) continue;
    if (r.estado === 'ok') resumo.ok++;
    else if (r.estado === 'quebrado') resumo.quebrados.push(r);
    else resumo.erros++;
    await dormir(PAUSA);
  }
  return resumo;
}

// Lê mensagens antigas de um canal e guarda os convites que achar
async function importar(client, canal, limite = 300) {
  let antes;
  let lidas = 0;
  let novos = 0;
  const vistos = new Set(Object.keys(todos()));

  while (lidas < limite) {
    const lote = await canal.messages.fetch({ limit: Math.min(100, limite - lidas), before: antes });
    if (!lote.size) break;
    for (const msg of lote.values()) {
      const textos = [msg.content, ...msg.embeds.map((e) => e.description || '')];
      const codigos = acharTodos(textos.join('\n'));
      if (!codigos.length) continue;

      let promotorId = null;
      if (!msg.author.bot) promotorId = msg.author.id;
      else {
        const m = textos.join('\n').match(/Promotor:\s*<@!?(\d+)>/i);
        if (m) promotorId = m[1];
      }
      for (const codigo of codigos) {
        if (vistos.has(codigo)) continue;
        vistos.add(codigo);
        registrar({ codigo, promotorId, canalId: msg.channelId, msgId: msg.id });
        novos++;
      }
    }
    lidas += lote.size;
    antes = lote.last().id;
    if (lote.size < 100) break;
  }
  return { lidas, novos };
}

module.exports = {
  conf, setCfg, todos, obter, codigoDe, acharTodos, registrar, remover,
  checarUm, processar, tick, verificarTodos, importar,
};
