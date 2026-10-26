// Lista de tudo o que o site pode editar, com validação.
// O site nunca grava direto: ele manda um "pedido" e o bot valida cada campo aqui.
const { ChannelType } = require('discord.js');
const db = require('../db');
const Rec = require('../recepcao/util');
const Not = require('../noturno/nucleo');
const Mod = require('../moderacao/nucleo');
const Liv = require('../livraria/nucleo');
const Tkt = require('../ticket/nucleo');
const Ani = require('../aniversario/nucleo');
const Vag = require('../vagas/nucleo');
const Ina = require('../inatividade/nucleo');
const Mis = require('../missoes/nucleo');
const Che = require('../chefe/nucleo');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const specs = [];
const add = (c) => specs.push(c);

function mensagens(grupo, base, padroes, info) {
  for (const [tipo, p] of Object.entries(padroes.mensagens)) {
    const [rotulo, vars] = info[tipo] || [tipo, ''];
    const dica = vars ? `Variáveis: ${vars}` : 'Sem variáveis.';
    add({ grupo, caminho: `${base}.mensagens.${tipo}.titulo`, rotulo: `${rotulo} — título`, tipo: 'texto', max: 200, padrao: p.titulo, dica });
    add({ grupo, caminho: `${base}.mensagens.${tipo}.texto`, rotulo: `${rotulo} — texto`, tipo: 'longo', max: 2000, padrao: p.texto, dica });
  }
}

// ---------- Geral ----------
add({ grupo: 'Geral', caminho: 'config.prefixo', rotulo: 'Prefixo dos comandos de texto (ex.: !cargo)', tipo: 'texto', max: 3, padrao: '!' });
add({ grupo: 'Geral', caminho: 'config.mensagens.ativo', rotulo: 'Usar as mensagens editadas com /mensagens (desligado = textos originais)', tipo: 'bool', padrao: true });
add({ grupo: 'Geral', caminho: 'config.rpg.canal', rotulo: 'Canal do RPG (vazio = todos os canais)', tipo: 'canal', padrao: null });

// ---------- Recepção ----------
add({ grupo: 'Recepção', caminho: 'config.recepcao.ativo', rotulo: 'Recepção ligada', tipo: 'bool', padrao: false });
for (const p of Rec.PASSOS) {
  add({ grupo: 'Recepção', caminho: `config.recepcao.canais.${p.id}`, rotulo: `Canal: ${p.nome}`, tipo: 'canal', padrao: null });
}
add({ grupo: 'Recepção', caminho: 'config.recepcao.cargos.semVaga', rotulo: 'Cargo "sem vaga"', tipo: 'cargo', padrao: null });
add({ grupo: 'Recepção', caminho: 'config.recepcao.cargos.verificado', rotulo: 'Cargo "verificado"', tipo: 'cargo', padrao: null });
add({ grupo: 'Recepção', caminho: 'config.recepcao.cargos.staff', rotulo: 'Cargo da staff (vê os canais de recepção)', tipo: 'cargo', padrao: null });
add({ grupo: 'Recepção', caminho: 'config.recepcao.categoria', rotulo: 'Categoria dos canais de recepção', tipo: 'categoria', padrao: null });
add({ grupo: 'Recepção', caminho: 'config.recepcao.apagarSegundos', rotulo: 'Apagar canal X segundos após verificar (0 = não apagar)', tipo: 'numero', min: 0, max: 3600, padrao: Rec.PADROES.apagarSegundos });
add({ grupo: 'Recepção', caminho: 'config.recepcao.moldes', rotulo: 'Moldes de nome (um por linha)', tipo: 'lista', maxItens: 25, maxLen: 60, exige: '{personagem}', padrao: Rec.PADROES.moldes, dica: 'Use {personagem} e {emoji}. O apelido final tem no máximo 32 caracteres.' });
add({ grupo: 'Recepção', caminho: 'config.recepcao.emojis', rotulo: 'Emojis disponíveis (um por linha)', tipo: 'lista', maxItens: 25, maxLen: 40, emoji: true, padrao: Rec.PADROES.emojis });
mensagens('Recepção', 'config.recepcao', Rec.PADROES, {
  boasVindas: ['Boas-vindas', '{usuario} {servidor}'],
  passos: ['Passos', '{usuario} {nick}'],
  sucesso: ['Sucesso', '{usuario} {nick}'],
});

// ---------- Noturno ----------
add({ grupo: 'Noturno', caminho: 'config.noturno.ativo', rotulo: 'Fechamento noturno ligado', tipo: 'bool', padrao: false });
add({ grupo: 'Noturno', caminho: 'config.noturno.fechar', rotulo: 'Hora de fechar os chats', tipo: 'hora', padrao: Not.PADROES.fechar });
add({ grupo: 'Noturno', caminho: 'config.noturno.abrir', rotulo: 'Hora de abrir os chats', tipo: 'hora', padrao: Not.PADROES.abrir });
add({ grupo: 'Noturno', caminho: 'config.noturno.aviso', rotulo: 'Avisar quantos minutos antes', tipo: 'numero', min: 1, max: 120, padrao: Not.PADROES.aviso });
add({ grupo: 'Noturno', caminho: 'config.noturno.avisoCanal', rotulo: 'Canal dos avisos', tipo: 'canal', padrao: null });
add({ grupo: 'Noturno', caminho: 'config.noturno.cargoDorminhoca', rotulo: 'Cargo marcado nos avisos (house dorminhoca)', tipo: 'cargo', padrao: null });
add({ grupo: 'Noturno', caminho: 'config.noturno.cargos', rotulo: 'Cargos extras afetados pelo fechamento (além de @everyone)', tipo: 'cargos', padrao: [] });
mensagens('Noturno', 'config.noturno', Not.PADROES, {
  avisoFechar: ['Aviso antes de fechar', '{minutos} {fechar}'],
  fechou: ['Chats fechados', '{abrir}'],
  avisoAbrir: ['Aviso antes de abrir', '{minutos} {abrir}'],
  abriu: ['Chats abertos', ''],
});

// ---------- Moderação ----------
add({ grupo: 'Moderação', caminho: 'config.moderacao.canalLog', rotulo: 'Canal de log da moderação', tipo: 'canal', padrao: null });
add({ grupo: 'Moderação', caminho: 'config.moderacao.limite', rotulo: 'Avisos para banir automaticamente', tipo: 'numero', min: 1, max: 10, padrao: Mod.PADROES.limite });
add({ grupo: 'Moderação', caminho: 'config.moderacao.regras', rotulo: 'Regras da house (uma por linha, máx. 20)', tipo: 'lista', maxItens: 20, maxLen: 180, padrao: [], dica: 'Mudar a ordem muda os números. Avisos antigos guardam o texto da época.' });
mensagens('Moderação', 'config.moderacao', Mod.PADROES, {
  dmAviso: ['DM de aviso', '{servidor} {motivo} {regra} {avisos} {limite}'],
  dmBan: ['DM de banimento', '{servidor} {motivo}'],
  dmExpulsao: ['DM de expulsão', '{servidor} {motivo}'],
});

// ---------- Livraria ----------
add({ grupo: 'Livraria', caminho: 'config.livraria.canalPublicacao', rotulo: 'Canal do painel de publicação', tipo: 'canal', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.canalLivros', rotulo: 'Canal onde os livros são publicados', tipo: 'canal', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.canalFeedback', rotulo: 'Canal do painel de feedback', tipo: 'canal', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.canalFeedbacks', rotulo: 'Canal onde os feedbacks são publicados', tipo: 'canal', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.categoria', rotulo: 'Categoria dos canais temporários', tipo: 'categoria', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.staff', rotulo: 'Cargo da staff (vê os canais temporários)', tipo: 'cargo', padrao: null });
add({ grupo: 'Livraria', caminho: 'config.livraria.minLinhas', rotulo: 'Mínimo de linhas da sinopse', tipo: 'numero', min: 1, max: 60, padrao: Liv.PADROES.minLinhas });
mensagens('Livraria', 'config.livraria', Liv.PADROES, {
  painelPublicacao: ['Painel de publicação', '{linhas}'],
  painelFeedback: ['Painel de feedback', ''],
});

// ---------- Tickets ----------
add({ grupo: 'Tickets', caminho: 'config.ticket.categoria', rotulo: 'Categoria dos tickets', tipo: 'categoria', padrao: null });
add({ grupo: 'Tickets', caminho: 'config.ticket.logCanal', rotulo: 'Canal de logs (transcrições)', tipo: 'canal', padrao: null });
add({ grupo: 'Tickets', caminho: 'config.ticket.limite', rotulo: 'Tickets abertos por pessoa', tipo: 'numero', min: 1, max: 10, padrao: Tkt.PADROES.limite });
add({ grupo: 'Tickets', caminho: 'config.ticket.pingStaff', rotulo: 'Marcar a staff ao abrir ticket', tipo: 'bool', padrao: false });
add({ grupo: 'Tickets', caminho: 'config.ticket.staff', rotulo: 'Cargos que atendem tickets', tipo: 'cargos', padrao: [] });
add({ grupo: 'Tickets', caminho: 'config.ticket.tipos', rotulo: 'Categorias do painel (botões)', tipo: 'tickettipos', maxItens: 15, padrao: Tkt.PADROES.tipos, dica: 'Depois de salvar, use /ticketconfig painel para postar o painel de novo.' });
mensagens('Tickets', 'config.ticket', Tkt.PADROES, {
  painel: ['Painel de tickets', ''],
  abertura: ['Abertura do ticket', '{usuario} {emoji} {numero} {categoria}'],
});

// ---------- Aniversário ----------
add({ grupo: 'Aniversário', caminho: 'config.aniversario.ativo', rotulo: 'Aniversário ligado', tipo: 'bool', padrao: false });
add({ grupo: 'Aniversário', caminho: 'config.aniversario.canal', rotulo: 'Canal da mensagem de festa', tipo: 'canal', padrao: null });
add({ grupo: 'Aniversário', caminho: 'config.aniversario.cargo', rotulo: 'Cargo de aniversariante (marcado na mensagem)', tipo: 'cargo', padrao: null });
add({ grupo: 'Aniversário', caminho: 'config.aniversario.hora', rotulo: 'Hora da mensagem', tipo: 'hora', padrao: Ani.PADROES.hora });
mensagens('Aniversário', 'config.aniversario', Ani.PADROES, {
  anuncio: ['Mensagem de festa', '{usuarios} {cargo}'],
});

// ---------- Ficha ----------
add({ grupo: 'Ficha', caminho: 'config.ficha.canal', rotulo: 'Canal onde as fichas são publicadas', tipo: 'canal', padrao: null });
add({ grupo: 'Ficha', caminho: 'config.ficha.limite', rotulo: 'Fichas por pessoa', tipo: 'numero', min: 1, max: 10, padrao: 3 });

// ---------- Vagas ----------
add({ grupo: 'Vagas', caminho: 'config.vagas.canalPedidos', rotulo: 'Canal onde a staff recebe os pedidos de vaga', tipo: 'canal', padrao: null });
add({ grupo: 'Vagas', caminho: 'config.vagas.cargo', rotulo: 'Cargo dado a quem ocupa uma vaga (opcional)', tipo: 'cargo', padrao: null });
add({ grupo: 'Vagas', caminho: 'config.vagas.limite', rotulo: 'Vagas por pessoa', tipo: 'numero', min: 1, max: 10, padrao: 1 });
mensagens('Vagas', 'config.vagas', Vag.PADROES, {
  painel: ['Painel de vagas', ''],
});

// ---------- Inatividade ----------
add({ grupo: 'Inatividade', caminho: 'config.inatividade.ativo', rotulo: 'Controle de inatividade ligado', tipo: 'bool', padrao: false });
add({ grupo: 'Inatividade', caminho: 'config.inatividade.canal', rotulo: 'Canal de justificativas', tipo: 'canal', padrao: null, dica: 'Para postar o painel com o botão, use /inatividadeconfig painel depois de salvar.' });
add({ grupo: 'Inatividade', caminho: 'config.inatividade.canalAviso', rotulo: 'Canal dos avisos (vazio = só DM)', tipo: 'canal', padrao: null });
add({ grupo: 'Inatividade', caminho: 'config.inatividade.avisoDias', rotulo: 'Dias sem aparecer até o aviso', tipo: 'numero', min: 1, max: 180, padrao: Ina.PADROES.avisoDias });
add({ grupo: 'Inatividade', caminho: 'config.inatividade.liberarDias', rotulo: 'Dias sem aparecer até liberar a vaga', tipo: 'numero', min: 2, max: 365, padrao: Ina.PADROES.liberarDias, dica: 'Precisa ser maior que o dia do aviso.' });
add({ grupo: 'Inatividade', caminho: 'config.inatividade.maxDias', rotulo: 'Máximo de dias que alguém pode justificar', tipo: 'numero', min: 1, max: 180, padrao: Ina.PADROES.maxDias });
mensagens('Inatividade', 'config.inatividade', Ina.PADROES, {
  painel: ['Painel de justificativa', ''],
  aviso: ['Aviso de inatividade', '{usuario} {dias} {restam} {vagas} {canal}'],
  liberada: ['Vaga liberada', '{usuario} {dias} {vagas}'],
});

// ---------- Missões ----------
add({ grupo: 'Missões', caminho: 'config.missoes.ativo', rotulo: 'Missões e conquistas ligadas', tipo: 'bool', padrao: true });
add({ grupo: 'Missões', caminho: 'config.missoes.canal', rotulo: 'Canal dos anúncios de conquista (vazio = DM)', tipo: 'canal', padrao: null });
mensagens('Missões', 'config.missoes', Mis.PADROES, {
  conquista: ['Conquista desbloqueada', '{usuario} {emoji} {conquista} {desc} {stars}'],
});

// ---------- Loja ----------
add({ grupo: 'Loja', caminho: 'config.loja.canalPedidos', rotulo: 'Canal onde a staff recebe os pedidos da loja', tipo: 'canal', padrao: null });

// ---------- Chefes ----------
mensagens('Chefes', 'config.chefe', Che.PADROES, {
  chamada: ['Aparição do chefe', '{emoji} {chefe}'],
  vitoria: ['Vitória', '{chefe} {ultimo} {mvp}'],
  fuga: ['Fuga', '{chefe}'],
});

const porCaminho = new Map(specs.map((c) => [c.caminho, c]));

// ---------- Validação ----------
function validar(c, v, guild) {
  const vazio = v === '' || v === null || v === undefined;

  switch (c.tipo) {
    case 'texto':
    case 'longo': {
      if (typeof v !== 'string') return { erro: 'Texto inválido.' };
      const t = v.trim();
      if (!t) return { remover: true };
      if (t.length > c.max) return { erro: `Máximo de ${c.max} caracteres.` };
      return { valor: t };
    }
    case 'numero': {
      const n = Number(v);
      if (!Number.isInteger(n) || n < c.min || n > c.max) return { erro: `Use um número inteiro de ${c.min} a ${c.max}.` };
      return { valor: n };
    }
    case 'bool':
      return typeof v === 'boolean' ? { valor: v } : { erro: 'Valor inválido.' };
    case 'hora': {
      const h = Not.normalizarHora(v);
      return h ? { valor: h } : { erro: 'Hora inválida. Use 00:00.' };
    }
    case 'canal': {
      if (vazio) return { remover: true };
      const ch = guild.channels.cache.get(String(v));
      if (!ch || !TIPOS_TEXTO.includes(ch.type)) return { erro: 'Canal não encontrado (ou não é de texto).' };
      return { valor: ch.id };
    }
    case 'categoria': {
      if (vazio) return { remover: true };
      const ch = guild.channels.cache.get(String(v));
      if (!ch || ch.type !== ChannelType.GuildCategory) return { erro: 'Categoria não encontrada.' };
      return { valor: ch.id };
    }
    case 'cargo': {
      if (vazio) return { remover: true };
      const r = guild.roles.cache.get(String(v));
      if (!r || r.id === guild.id || r.managed) return { erro: 'Cargo não encontrado (ou é de integração).' };
      return { valor: r.id };
    }
    case 'cargos': {
      if (!Array.isArray(v) || v.length > 25) return { erro: 'Lista de cargos inválida.' };
      const ids = [];
      for (const id of v) {
        const r = guild.roles.cache.get(String(id));
        if (!r || r.managed) return { erro: 'Um dos cargos não existe neste servidor.' };
        if (!ids.includes(r.id)) ids.push(r.id);
      }
      return { valor: ids };
    }
    case 'lista': {
      if (!Array.isArray(v)) return { erro: 'Lista inválida.' };
      const itens = [];
      for (const x of v) {
        const t = String(x).trim();
        if (!t || itens.includes(t)) continue;
        if (t.length > c.maxLen) return { erro: `Cada linha pode ter no máximo ${c.maxLen} caracteres.` };
        if (c.exige && !t.includes(c.exige)) return { erro: `Cada linha precisa conter ${c.exige}: "${t}"` };
        if (c.emoji && !Tkt.emojiValido(t)) return { erro: `"${t}" não é um emoji válido.` };
        itens.push(t);
      }
      if (itens.length > c.maxItens) return { erro: `Máximo de ${c.maxItens} itens.` };
      if (!itens.length && (c.exige || c.emoji)) return { remover: true };
      return { valor: itens };
    }
    case 'tickettipos': {
      if (!Array.isArray(v) || v.length < 1 || v.length > c.maxItens) return { erro: `Precisa ter de 1 a ${c.maxItens} categorias.` };
      const existentes = new Set(Tkt.tipos().map((t) => t.id));
      const usados = new Set();
      const lista = [];
      for (const t of v) {
        const nome = String((t && t.nome) || '').trim();
        const emoji = String((t && t.emoji) || '').trim();
        const desc = String((t && t.desc) || '').trim();
        if (!nome || nome.length > 40) return { erro: 'Toda categoria precisa de nome (até 40 caracteres).' };
        if (desc.length > 80) return { erro: 'A descrição pode ter até 80 caracteres.' };
        if (emoji && !Tkt.emojiValido(emoji)) return { erro: `Emoji inválido: "${emoji}".` };
        let id = t && existentes.has(t.id) && !usados.has(t.id) ? t.id : null;
        if (!id) id = Tkt.proximoIdTipo();
        usados.add(id);
        lista.push({ id, nome, emoji, desc });
      }
      return { valor: lista };
    }
    default:
      return { erro: 'Tipo de campo desconhecido.' };
  }
}

function aplicar(caminho, valor, guild) {
  const c = porCaminho.get(caminho);
  if (!c) return { erro: 'Campo desconhecido.' };
  if (valor === null) {
    db.remover(caminho);
    return { ok: true };
  }
  const r = validar(c, valor, guild);
  if (r.erro) return { erro: r.erro };
  if (r.remover) db.remover(caminho);
  else db.set(caminho, r.valor);
  return { ok: true };
}

function processarPedido(pedido, guild) {
  const resultado = { id: String(pedido.id), quando: new Date().toISOString(), ok: [], erros: [] };
  const mud = pedido.mudancas && typeof pedido.mudancas === 'object' ? pedido.mudancas : {};
  const chaves = Object.keys(mud).slice(0, 200);
  for (const caminho of chaves) {
    const r = aplicar(caminho, mud[caminho], guild);
    if (r.ok) resultado.ok.push(caminho);
    else resultado.erros.push({ caminho, erro: r.erro });
  }
  return resultado;
}

// ---------- Estado publicado para o site ----------
function montarEstado(guild, resultado) {
  const campos = specs.map((c) => {
    const salvo = db.get(c.caminho, undefined);
    return {
      grupo: c.grupo,
      caminho: c.caminho,
      rotulo: c.rotulo,
      tipo: c.tipo,
      dica: c.dica || '',
      min: c.min,
      max: c.max,
      maxItens: c.maxItens,
      padrao: c.padrao === undefined ? null : c.padrao,
      valor: salvo === undefined ? (c.padrao === undefined ? null : c.padrao) : salvo,
      personalizado: salvo !== undefined,
    };
  });

  const canais = guild.channels.cache
    .filter((c) => TIPOS_TEXTO.includes(c.type))
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((c) => ({ id: c.id, nome: c.name, categoria: c.parent ? c.parent.name : '' }));
  const categorias = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((c) => ({ id: c.id, nome: c.name }));
  const cargos = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, nome: r.name }));

  return {
    versao: 1,
    servidor: { id: guild.id, nome: guild.name },
    resultado: resultado || null,
    campos,
    canais: [...canais.values()],
    categorias: [...categorias.values()],
    cargos: [...cargos.values()],
  };
}

module.exports = { specs, aplicar, processarPedido, montarEstado };
