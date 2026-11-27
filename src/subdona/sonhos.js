const UI = require('../ui/componentes');
const N = require('./nucleo');

const SEM_PING = { parse: [] };
const VERBO = /(transfer|enviou|envio|pagou|pagament|mandou|depositou|doou|deu|recebeu|received|sent|paid|payment|transaction|transacao)/i;

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

function entenderPagamento(texto, { responsavelId, euId, quemUsou = null }) {
  const sonhos = /(\d[\d.,]*)\s*\**\s*(?:sonhos?|sonhos\b)/i.exec(texto.replace(/\*/g, ''));
  if (!sonhos || !VERBO.test(texto)) return null;
  const valor = numero(sonhos[1]);
  if (!valor || valor > 1e12) return null;
  const mencoes = [...texto.matchAll(/<@!?(\w{2,20})>/g)].map((m) => m[1]).filter((v, i, l) => l.indexOf(v) === i && v !== euId);
  if (!mencoes.includes(responsavelId)) return null;
  const pagador = mencoes.find((id) => id !== responsavelId) || quemUsou;
  if (!pagador || pagador === responsavelId) return null;
  return { valor, pagador, recebedor: responsavelId };
}

async function aoMensagem(client, msg) {
  if (!N.ativo() || !msg.guild || !msg.author || msg.author.id !== N.lorittaId()) return;
  const responsavel = await N.responsavelId(client);
  if (!responsavel) return;
  const tk = require('../ticket/nucleo').ticketDoCanal(msg.channelId);
  if (!tk) return;

  const texto = textoDe(msg);
  if (!texto) return;
  if (texto.includes(`<@${responsavel}>`) || texto.includes(`<@!${responsavel}>`) || /sonhos/i.test(texto) && texto.includes(responsavel)) N.guardarAmostra(texto);

  const meta = msg.interactionMetadata || msg.interaction || null;
  const quemUsou = meta && (meta.user ? meta.user.id : meta.userId) ? (meta.user ? meta.user.id : meta.userId) : null;
  const p = entenderPagamento(texto, { responsavelId: responsavel, euId: client.user.id, quemUsou });
  if (!p) return;

  const l = N.caixa();
  if (l.some((x) => x.msgId === msg.id || (x.pagador === p.pagador && x.valor === p.valor && Date.now() - x.em < 20000))) return;

  const cobs = N.cobrancas();
  const cob = cobs.find((c) => c.status === 'aberta' && c.membro === p.pagador && p.valor >= c.valor);
  const id = N.lancar({ pagador: p.pagador, valor: p.valor, msgId: msg.id, canalId: msg.channelId, ticket: tk.numero || null, cobranca: cob ? cob.id : null });

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
      descricao: `<@${p.pagador}> enviou **${p.valor.toLocaleString('pt-BR')} sonhos** para <@${responsavel}> neste ticket${cob ? `\nCobrança **#${cob.id}** paga${cob.motivo ? `: ${cob.motivo}` : ''}.` : ''}${entrega}\n${aus ? 'Anotei para o responsável, que está ausente.' : 'Anotei no caixa.'} Obrigada!`,
      rodape: `Total no caixa: ${total.toLocaleString('pt-BR')} sonhos`,
    })],
    allowedMentions: SEM_PING,
  }).catch(() => {});
  if (aus) {
    try { const u = await client.users.fetch(responsavel); await u.send(`Recebi **${p.valor.toLocaleString('pt-BR')} sonhos** de <@${p.pagador}> em ${msg.url || 'um canal'}.`); } catch {}
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
