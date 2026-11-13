// Central de ajuda do Atlas.
// Lê os comandos que o bot realmente tem e monta: tela inicial + categorias com menu e paginação.
const UI = require('../ui/componentes');
const { S, corta } = require('../ui/tema');

const MODERACAO = new Set(['aviso', 'ban', 'desbanir', 'expulsar', 'moderacao', 'cargo']);
const MAX_PAGINA = 3200;

const TITULOS = {
  membros: 'Membros',
  moderacao: 'Moderação',
  configuracao: 'Configuração e eventos',
};
const DESCRICOES = {
  membros: 'Tudo que qualquer pessoa da house pode usar',
  moderacao: 'Ferramentas da staff para manter a ordem',
  configuracao: 'Painéis, eventos e ajustes do Atlas',
};

const ehSubStaff = (desc) => /staff/i.test(desc || '');

// Achata um comando em { nome, desc, subs:[{caminho, nome, desc, staff}], staff }
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

// "Esconde" a marca (staff) da descrição, porque o símbolo já mostra isso
const limpaStaff = (d) => String(d || '').replace(/\s*\(\s*staff\s*\)\s*/gi, ' ').trim();

function bloco(c) {
  const topo = `**/${c.nome}**\n${S.filho} ${corta(limpaStaff(c.desc), 110)}`;
  if (!c.subs.length) return topo;
  const linhas = c.subs.map((s) => {
    const marca = s.staff && !c.staff ? `  ${S.lock}` : '';
    return `\`/${s.caminho}\` ${S.sep} ${corta(limpaStaff(s.desc), 85)}${marca}`;
  });
  return `${topo}\n${linhas.join('\n')}`;
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

// Menu de categorias (aparece em todas as telas)
function menuCategorias(atual) {
  return UI.menu({
    id: 'cmds:menu',
    placeholder: 'Escolher categoria',
    opcoes: [
      { valor: 'inicio', nome: 'Início', desc: 'Visão geral do Atlas', padrao: atual === 'inicio' },
      ...Object.keys(TITULOS).map((t) => ({
        valor: t, nome: TITULOS[t], desc: DESCRICOES[t], padrao: atual === t,
      })),
    ],
  });
}

function inicio(client) {
  const contagem = (t) => comandosDoTipo(client, t).length;
  const linhas = Object.keys(TITULOS)
    .map((t) => `**${TITULOS[t]}**  ${S.sep}  ${contagem(t)} comandos\n${S.filho} ${DESCRICOES[t]}`)
    .join('\n\n');
  const embed = UI.painel({
    trilha: ['Ajuda'],
    titulo: 'Central de ajuda',
    descricao: `Escolha uma categoria no menu abaixo.\n\n${linhas}`,
    rodape: `${S.lock} indica uma parte só para a staff`,
  });
  return { embeds: [embed], components: [menuCategorias('inicio')] };
}

function montar(client, tipo, pagina = 0) {
  if (!tipo || tipo === 'inicio' || !TITULOS[tipo]) return inicio(client);
  const { pags, total } = paginas(client, tipo);
  const p = Math.min(Math.max(0, pagina), pags.length - 1);
  const embed = UI.painel({
    trilha: ['Ajuda', TITULOS[tipo]],
    descricao: pags[p],
    rodape: `${total} comandos  ${S.sep}  ${S.lock} = só staff`,
  });
  const componentes = [menuCategorias(tipo)];
  const pag = UI.paginacao(`cmds:${tipo}`, p, pags.length);
  if (pag) componentes.push(pag);
  return { embeds: [embed], components: componentes };
}

module.exports = { montar, inicio, comandosDoTipo, descrever, TITULOS };
