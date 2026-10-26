// Monta a lista de comandos lendo os comandos que o bot realmente tem.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const COR = 0xf5a3c7;
const MODERACAO = new Set(['aviso', 'ban', 'desbanir', 'expulsar', 'moderacao', 'cargo']);
const TITULOS = {
  membros: '📖 Comandos para membros',
  moderacao: '🛡️ Comandos de moderação (staff)',
  configuracao: '⚙️ Comandos de configuração e eventos (staff)',
};
const MAX_PAGINA = 3600;

const corta = (t, n) => {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const ehSubStaff = (desc) => /staff/i.test(desc || '');

// Achata um comando em { nome, desc, subs:[{caminho, desc, staff}] }
function descrever(json) {
  const subs = [];
  for (const o of json.options || []) {
    if (o.type === 1) {
      subs.push({ caminho: `${json.name} ${o.name}`, desc: o.description, staff: ehSubStaff(o.description) });
    } else if (o.type === 2) {
      for (const s of o.options || []) {
        subs.push({ caminho: `${json.name} ${o.name} ${s.name}`, desc: s.description, staff: ehSubStaff(s.description) });
      }
    }
  }
  const staffCmd = json.default_member_permissions != null || (subs.length > 0 && subs.every((s) => s.staff));
  return { nome: json.name, desc: json.description, subs, staff: staffCmd };
}

function bloco(c) {
  if (!c.subs.length) return `**/${c.nome}** — ${corta(c.desc, 110)}`;
  const linhas = c.subs.map((s) => `• \`/${s.caminho}\` — ${corta(s.desc, 90)}${s.staff && !c.staff ? ' 🔒' : ''}`);
  return `**/${c.nome}** — ${corta(c.desc, 110)}\n${linhas.join('\n')}`;
}

function comandosDoTipo(client, tipo) {
  const todos = [...client.commands.values()].map((c) => descrever(c.data.toJSON()));
  let lista;
  if (tipo === 'membros') lista = todos.filter((c) => !c.staff);
  else if (tipo === 'moderacao') lista = todos.filter((c) => c.staff && MODERACAO.has(c.nome));
  else lista = todos.filter((c) => c.staff && !MODERACAO.has(c.nome));
  return lista.sort((a, b) => a.nome.localeCompare(b.nome));
}

function paginas(client, tipo) {
  const lista = comandosDoTipo(client, tipo);
  const pags = [];
  let atual = '';
  for (const c of lista) {
    const b = bloco(c).slice(0, MAX_PAGINA);
    if (atual && atual.length + b.length + 2 > MAX_PAGINA) {
      pags.push(atual);
      atual = '';
    }
    atual += (atual ? '\n\n' : '') + b;
  }
  if (atual) pags.push(atual);
  return { pags: pags.length ? pags : ['Nenhum comando nessa categoria.'], total: lista.length };
}

function montar(client, tipo, pagina) {
  const { pags, total } = paginas(client, tipo);
  const p = Math.min(Math.max(0, pagina), pags.length - 1);
  const rodape = tipo === 'membros'
    ? `${total} comandos · 🔒 = parte só para a staff · página ${p + 1}/${pags.length}`
    : `${total} comandos · página ${p + 1}/${pags.length}`;
  const embed = new EmbedBuilder().setColor(COR).setTitle(TITULOS[tipo]).setDescription(pags[p]).setFooter({ text: rodape });
  const linha = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cmds:${tipo}:${p - 1}`).setLabel('Anterior').setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
    new ButtonBuilder().setCustomId(`cmds:${tipo}:${p + 1}`).setLabel('Próxima').setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(p >= pags.length - 1),
  );
  return { embeds: [embed], components: pags.length > 1 ? [linha] : [] };
}

module.exports = { montar, comandosDoTipo, descrever, TITULOS };
