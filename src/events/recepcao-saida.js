const db = require('../db');
const U = require('../recepcao/util');

const LIMITE_MENSAGENS = 3000; // quantas mensagens do canal o Atlas olha
const apagando = new Set(); // quem já está sendo limpo (evita rodar duas vezes)

// Busca mensagens antigas de um canal, de 100 em 100
async function buscarMensagens(canal, limite) {
  const todas = [];
  let antes;
  while (todas.length < limite) {
    const lote = await canal.messages.fetch({ limit: 100, ...(antes ? { before: antes } : {}) });
    if (lote.size === 0) break;
    todas.push(...lote.values());
    antes = lote.last().id;
    if (lote.size < 100) break;
  }
  return todas;
}

// Lê o texto que estiver dentro dos componentes (mensagens de outros bots)
function textoComponentes(lista) {
  let t = '';
  for (const c of lista || []) {
    if (c.content) t += ' ' + c.content;
    if (c.components) t += textoComponentes(c.components);
  }
  return t;
}

// Junta o texto da mensagem com o texto dos embeds e dos componentes
function textoDaMensagem(msg) {
  let texto = msg.content || '';
  for (const e of msg.embeds) {
    const partes = [e.title, e.description, e.author && e.author.name, e.footer && e.footer.text];
    for (const f of e.fields || []) partes.push(f.name, f.value);
    texto += ' ' + partes.filter(Boolean).join(' ');
  }
  return texto + textoComponentes(msg.components);
}

// Apaga as mensagens do membro no canal "fechar vaga":
// as que ele mesmo escreveu e as postadas por bots (formulários) marcando ele
async function limparCanalDeVaga(member) {
  const canalId = U.cfg('canais.fechar_vaga');
  if (!canalId || apagando.has(member.id)) return;
  apagando.add(member.id);
  try {
    const canal = await member.guild.channels.fetch(canalId).catch(() => null);
    if (!canal || !canal.isTextBased()) return;

    const mensagens = await buscarMensagens(canal, LIMITE_MENSAGENS);
    const marcas = [`<@${member.id}>`, `<@!${member.id}>`];
    const dele = mensagens.filter((m) => {
      if (m.author && m.author.id === member.id) return true;
      if (!m.author || !m.author.bot) return false;
      const texto = textoDaMensagem(m);
      return m.mentions.users.has(member.id) || marcas.some((x) => texto.includes(x));
    });

    let apagadas = 0;
    for (const m of dele) {
      const ok = await m.delete().then(() => true).catch(() => false);
      if (ok) apagadas++;
    }
    if (dele.length) console.log(`[Recepção] ${apagadas}/${dele.length} mensagem(ns) de ${member.id} apagadas no canal de fechar vaga.`);
  } catch (e) {
    console.error('[Recepção] limpar canal de fechar vaga:', e.message);
  } finally {
    apagando.delete(member.id);
  }
}

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    // Apaga o canal da recepção, se a pessoa estava no meio dela
    const sessao = db.get(`recepcao.sessoes.${member.id}`);
    if (sessao) {
      const canal = await member.guild.channels.fetch(sessao.canalId).catch(() => null);
      if (canal) await canal.delete('Membro saiu do servidor').catch(() => {});
      db.remover(`recepcao.sessoes.${member.id}`);
    }

    // Apaga as mensagens dela no canal de fechar vaga
    if (member.user && member.user.bot) return;
    await limparCanalDeVaga(member);
  },
};
