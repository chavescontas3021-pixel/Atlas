// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · caixa de sonhos (Loritta)
//
//  A Atlas não guarda sonhos (bot não consegue gastar). Ela VIGIA as mensagens da Loritta,
//  reconhece quando alguém paga o pai, anota no caixa, agradece e avisa o pai.
//  Cobranças: o pai cria uma cobrança (/caixa cobrar) e, quando o pagamento chega, a Atlas
//  marca como paga e entrega o cargo combinado, se houver.
//
//  ATENÇÃO: o formato exato das mensagens da Loritta pode mudar. Se um pagamento não for
//  reconhecido, veja /caixa amostras e /caixa teste, e ajuste com um exemplo real.
// ─────────────────────────────────────────────────────────────
const UI = require('../ui/componentes');
const N = require('./nucleo');

const SEM_PING = { parse: [] };
const VERBO = /(transfer|enviou|envio|pagou|pagament|mandou|depositou|doou|deu|recebeu|received|sent|paid|payment|transaction|transacao)/i;

// Junta tudo que a mensagem mostra: texto, embeds e botões
function textoDe(msg) {
  const partes = [msg.content || ''];
  for (const e of msg.embeds || []) {
    const d = e.data || e.d || e;
    partes.push(d.title, d.description, d.footer && d.footer.text, d.author && d.author.name);
    for (const f of d.fields || []) partes.push(f.name, f.value);
  }
  return partes.filter(Boolean).join('\n');
}

const numero = (t) => parseInt(String(t).replace(/[^\d]/g, ''), 10);

// Devolve { valor, pagador, recebedor } ou null
function entenderPagamento(texto, { paiId, euId, quemUsou = null }) {
  const sonhos = /(\d[\d.,]*)\s*\**\s*(?:sonhos?|sonhos\b)/i.exec(texto.replace(/\*/g, ''));
  if (!sonhos || !VERBO.test(texto)) return null;
  const valor = numero(sonhos[1]);
  if (!valor || valor > 1e12) return null;
  const mencoes = [...texto.matchAll(/<@!?(\w{2,20})>/g)].map((m) => m[1]).filter((v, i, l) => l.indexOf(v) === i && v !== euId);
  if (!mencoes.includes(paiId)) return null; // o pagamento precisa citar o pai
  const pagador = mencoes.find((id) => id !== paiId) || quemUsou;
  if (!pagador || pagador === paiId) return null;
  return { valor, pagador, recebedor: paiId };
}

async function aoMensagem(client, msg) {
  if (!N.ativo() || !msg.guild || !msg.author || msg.author.id !== N.lorittaId()) return;
  const pai = await N.paiId(client);
  if (!pai) return;
  const canalFixo = N.cfg('sonhos_canal', null);
  if (canalFixo && msg.channelId !== canalFixo) return;

  const texto = textoDe(msg);
  if (!texto) return;
  if (texto.includes(`<@${pai}>`) || texto.includes(`<@!${pai}>`) || /sonhos/i.test(texto) && texto.includes(pai)) N.guardarAmostra(texto);

  const meta = msg.interactionMetadata || msg.interaction || null;
  const quemUsou = meta && (meta.user ? meta.user.id : meta.userId) ? (meta.user ? meta.user.id : meta.userId) : null;
  const p = entenderPagamento(texto, { paiId: pai, euId: client.user.id, quemUsou });
  if (!p) return;

  // Não conta duas vezes a mesma mensagem (ou o mesmo pagamento em 20 s)
  const l = N.caixa();
  if (l.some((x) => x.msgId === msg.id || (x.pagador === p.pagador && x.valor === p.valor && Date.now() - x.em < 20000))) return;

  // Cobrança aberta desse pagador?
  const cobs = N.cobrancas();
  const cob = cobs.find((c) => c.status === 'aberta' && c.membro === p.pagador && p.valor >= c.valor);
  const id = N.lancar({ pagador: p.pagador, valor: p.valor, msgId: msg.id, canalId: msg.channelId, cobranca: cob ? cob.id : null });

  let entrega = '';
  if (cob) {
    cob.status = 'paga'; cob.pagoEm = Date.now(); cob.caixa = id;
    N.salvarCobrancas(cobs);
    if (cob.cargo) {
      try {
        const m = await msg.guild.members.fetch(p.pagador);
        const role = msg.guild.roles.cache.get(cob.cargo);
        if (role && !role.managed && role.position < msg.guild.members.me.roles.highest.position) { await m.roles.add(role, 'Pagamento via Loritta (cobrança)'); entrega = `\nEntreguei o cargo <@&${role.id}>.`; } else entrega = '\nNão consegui entregar o cargo (ele está acima do meu). Avise a staff.';
      } catch { entrega = '\nNão consegui entregar o cargo. Avise a staff.'; }
    }
  }
  const total = N.caixa().reduce((s, x) => s + x.valor, 0);
  const aus = N.ausencia();
  await msg.reply({
    embeds: [UI.painel({
      trilha: ['Caixa'], titulo: 'Pagamento recebido',
      descricao: `<@${p.pagador}> enviou **${p.valor.toLocaleString('pt-BR')} sonhos** para <@${pai}>${cob ? `\nCobrança **#${cob.id}** paga${cob.motivo ? `: ${cob.motivo}` : ''}.` : ''}${entrega}\n${aus ? 'Anotei para o pai, que está ausente.' : 'Anotei no caixa.'} Obrigada!`,
      rodape: `Total no caixa: ${total.toLocaleString('pt-BR')} sonhos`,
    })],
    allowedMentions: SEM_PING,
  }).catch(() => {});
  // Aviso por DM só quando o pai está ausente (presente ele vê o canal)
  if (aus) {
    try { const u = await client.users.fetch(pai); await u.send(`Recebi **${p.valor.toLocaleString('pt-BR')} sonhos** de <@${p.pagador}> em ${msg.url || 'um canal'}.`); } catch { /* DM fechada */ }
  }
}

function novaCobranca({ membro, valor, motivo, cargo }) {
  const l = N.cobrancas();
  const id = (l.reduce((m, c) => Math.max(m, c.id), 0)) + 1;
  l.push({ id, membro, valor, motivo: String(motivo || '').slice(0, 120), cargo: cargo || null, status: 'aberta', criada: Date.now() });
  N.salvarCobrancas(l);
  return id;
}

module.exports = { aoMensagem, entenderPagamento, textoDe, novaCobranca };
