// ATLAS · sub dona · ordens extras 1: tickets, sorteios e eventos, canais, pânico, avisos
// Instalado por acoes.js. Cada função devolve { ok, texto, desfazer } como as ações da parte 1.
const UI = require('../ui/componentes');
const { S, quando, corta } = require('../ui/tema');

const PODER_DE = {
  tk_fechar: 'ticket_gerir', tk_add: 'ticket_gerir', tk_rem: 'ticket_gerir', tk_renomear: 'ticket_gerir',
  sorteio_criar: 'sorteios', sorteio_encerrar: 'sorteios', sorteio_rerolar: 'sorteios', evento_criar: 'sorteios',
  canal_criar: 'canais', canal_renomear: 'canais', canal_apagar: 'canais', panico_on: 'panico', panico_off: 'panico', avisos_limpar: 'advertir',
};
const ROTULO = {
  tk_fechar: 'Fechar o ticket', tk_add: 'Adicionar ao ticket', tk_rem: 'Tirar do ticket', tk_renomear: 'Renomear o ticket',
  sorteio_criar: 'Criar sorteio', sorteio_encerrar: 'Encerrar sorteio', sorteio_rerolar: 'Sortear de novo', evento_criar: 'Criar evento',
  canal_criar: 'Criar canal', canal_renomear: 'Renomear canal', canal_apagar: 'Apagar canal', panico_on: 'Trancar o servidor', panico_off: 'Destrancar o servidor',
  avisos_ver: 'Ver avisos', avisos_limpar: 'Limpar avisos',
};
const LEITURA = ['avisos_ver'];

const FLAGS_TICKET = { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true, EmbedLinks: true };
const nomeCanal = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

function descrever(acao, p) {
  const quem = p.alvo ? `<@${p.alvo}>` : '';
  switch (acao) {
    case 'tk_fechar': return 'Fechar este ticket e mandar a transcrição';
    case 'tk_add': return `Adicionar ${quem} ao ticket`;
    case 'tk_rem': return `Tirar ${quem} do ticket`;
    case 'tk_renomear': return `Renomear o ticket para ${nomeCanal(p.nome)}`;
    case 'sorteio_criar': return `Sorteio de **${p.premio}**, ${p.vencedores || 1} vencedor(es), termina em ${Math.round(p.ms / 60000)} min`;
    case 'sorteio_encerrar': return `Encerrar o sorteio #${p.id}`;
    case 'sorteio_rerolar': return `Sortear de novo no sorteio #${p.id}`;
    case 'evento_criar': return `Criar o evento **${p.titulo}** para daqui a ${Math.round(p.ms / 60000)} min`;
    case 'canal_criar': return `Criar o canal de ${p.voz ? 'voz' : 'texto'} **${nomeCanal(p.nome)}**`;
    case 'canal_renomear': return `Renomear o canal para **${nomeCanal(p.nome)}**`;
    case 'canal_apagar': return `**APAGAR** o canal ${p.canalAlvo ? `#${p.canalAlvo.name}` : (p.canalId ? `<#${p.canalId}>` : '')} (não dá para desfazer)`;
    case 'panico_on': return 'Trancar TODOS os canais de texto do servidor';
    case 'panico_off': return 'Destrancar todos os canais que o pânico trancou';
    case 'avisos_limpar': return `Apagar todos os avisos de ${quem}`;
    default: return null;
  }
}

function instalar({ falha, bom, membroDe, protegerAlvo }) {
  const tk = (ctx, p) => {
    const canal = p.canalAlvo || ctx.canal;
    const t = canal && require('../ticket/nucleo').ticketDoCanal(canal.id);
    return t ? { canal, t } : null;
  };
  const SEM_TK = 'Isso só funciona dentro de um ticket (ou marcando o canal do ticket).';

  return {
    async tk_fechar(ctx, p) {
      const r = tk(ctx, p); if (!r) return falha(SEM_TK);
      await require('../ticket/fluxo').encerrar(ctx.guild, r.canal, ctx.executorUser, p.motivo || `Fechado pela Atlas a pedido de ${ctx.executorUser.tag}`);
      return bom('Ticket encerrado. A transcrição foi enviada.');
    },
    async tk_add(ctx, p) {
      const r = tk(ctx, p); if (!r) return falha(SEM_TK);
      const m = await membroDe(ctx, p.alvo); if (!m) return falha('Marque quem eu devo adicionar ao ticket.');
      await r.canal.permissionOverwrites.edit(m.id, FLAGS_TICKET);
      return bom(`**${m.displayName}** foi adicionado ao ticket.`, { acao: 'tk_rem', alvo: m.id, canalId: r.canal.id });
    },
    async tk_rem(ctx, p) {
      const r = tk(ctx, p); if (!r) return falha(SEM_TK);
      if (p.alvo === r.t.userId) return falha('Não dá para tirar quem abriu o ticket.');
      const m = await membroDe(ctx, p.alvo); if (!m) return falha('Marque quem eu devo tirar do ticket.');
      await r.canal.permissionOverwrites.delete(m.id);
      return bom(`**${m.displayName}** foi tirado do ticket.`, { acao: 'tk_add', alvo: m.id, canalId: r.canal.id });
    },
    async tk_renomear(ctx, p) {
      const r = tk(ctx, p); if (!r) return falha(SEM_TK);
      const nome = nomeCanal(p.nome); if (!nome) return falha('Diga o novo nome. Exemplo: `atlas, renomeia o ticket para duvida-vaga`.');
      const antes = r.canal.name;
      await r.canal.setName(nome);
      return bom(`Ticket renomeado para **${nome}**.`, { acao: 'tk_renomear', nome: antes, canalId: r.canal.id });
    },

    async sorteio_criar(ctx, p) {
      if (!p.premio) return falha('Diga o prêmio. Exemplo: `atlas, faz um sorteio de Nitro por 1 hora`.');
      const canal = p.canalAlvo || ctx.canal;
      const E = require('../eventos/nucleo');
      const s = { id: E.proximoId('sorteios'), guildId: ctx.guild.id, canalId: canal.id, msgId: null, criadorId: ctx.executorUser.id, criadorNome: ctx.executorUser.username || 'Atlas', premioTipo: 'texto', premio: String(p.premio).slice(0, 100), vencedores: Math.min(10, p.vencedores || 1), fim: Date.now() + p.ms, cargoExigido: null, nivelMin: 0, participantes: [], ganhadores: [], status: 'ativo' };
      const msg = await canal.send({ embeds: [E.embedSorteio(s)], components: E.botoesSorteio(s), allowedMentions: { parse: [] } });
      s.msgId = msg.id; E.salvarSorteio(s);
      return bom(`Sorteio **#${s.id}** criado em ${canal}: ${s.premio}.`);
    },
    async sorteio_encerrar(ctx, p) {
      if (!p.id) return falha('Diga o número do sorteio. Exemplo: `atlas, encerra o sorteio 3`.');
      const r = await require('../eventos/nucleo').encerrarSorteio(ctx.client, String(p.id));
      if (r.erro) return falha(r.erro);
      return bom(r.ganhadores && r.ganhadores.length ? `Sorteio #${p.id} encerrado. Vencedor(es): ${r.ganhadores.map((i) => `<@${i}>`).join(' ')}` : `Sorteio #${p.id} encerrado, mas ninguém elegível participou.`);
    },
    async sorteio_rerolar(ctx, p) {
      if (!p.id) return falha('Diga o número do sorteio. Exemplo: `atlas, sorteia de novo o sorteio 3`.');
      const r = await require('../eventos/nucleo').rerolarSorteio(ctx.client, String(p.id), 1);
      if (r.erro) return falha(r.erro);
      return bom(`Sorteei de novo no #${p.id}: ${r.ganhadores.map((i) => `<@${i}>`).join(' ')}`);
    },
    async evento_criar(ctx, p) {
      if (!p.titulo) return falha('Diga o nome. Exemplo: `atlas, cria o evento Noite de jogos daqui 2 horas`.');
      const canal = p.canalAlvo || ctx.canal;
      const E = require('../eventos/nucleo');
      const e = { id: E.proximoId('eventos'), guildId: ctx.guild.id, canalId: canal.id, msgId: null, titulo: String(p.titulo).slice(0, 100), descricao: '', quando: Date.now() + p.ms, criadorId: ctx.executorUser.id, cargoPing: null, confirmados: [], aviso15: false, iniciou: false, status: 'ativo' };
      const msg = await canal.send({ embeds: [E.embedEvento(e)], components: E.botoesEvento(e), allowedMentions: { parse: [] } });
      e.msgId = msg.id; E.salvarEvento(e);
      return bom(`Evento **#${e.id}** criado em ${canal}: ${e.titulo}, ${quando(e.quando)}.`);
    },

    async canal_criar(ctx, p) {
      const nome = nomeCanal(p.nome); if (!nome) return falha('Diga o nome do canal. Exemplo: `atlas, cria um canal chamado eventos`.');
      const c = await ctx.guild.channels.create({ name: nome, type: p.voz ? 2 : 0, reason: `Atlas a mando de ${ctx.executorUser.tag}` });
      return bom(`Canal ${p.voz ? `**${c.name}** (voz)` : c} criado.`, { acao: 'canal_apagar', canalId: c.id });
    },
    async canal_renomear(ctx, p) {
      const c = p.canalAlvo || ctx.canal; const nome = nomeCanal(p.nome);
      if (!nome) return falha('Diga o novo nome. Exemplo: `atlas, renomeia o canal #geral para conversa`.');
      const antes = c.name; await c.setName(nome, `Atlas a mando de ${ctx.executorUser.tag}`);
      return bom(`Canal renomeado para **${nome}**.`, { acao: 'canal_renomear', nome: antes, canalId: c.id });
    },
    async canal_apagar(ctx, p) {
      const c = p.canalAlvo; if (!c) return falha('Por segurança, marque o canal que devo apagar. Exemplo: `atlas, apaga o canal #teste`.');
      if ([ctx.guild.rulesChannelId, ctx.guild.systemChannelId, require('./nucleo').alertasCanal()].includes(c.id)) return falha('Esse canal é importante (regras, sistema ou alertas). Apague você mesmo.');
      if (require('../ticket/nucleo').ticketDoCanal(c.id)) return falha('Isso é um ticket. Peça para eu **fechar** o ticket.');
      const nome = c.name; await c.delete(`Atlas a mando de ${ctx.executorUser.tag}`);
      return bom(`Canal **${nome}** apagado.`);
    },

    async panico_on(ctx) { const r = await require('./vigia').panico(ctx.guild, true); return bom(`Servidor trancado: ${r.trancados} canais.`, { acao: 'panico_off' }); },
    async panico_off(ctx) { const r = await require('./vigia').panico(ctx.guild, false); return bom(`Servidor destrancado: ${r.abertos} canais.`, { acao: 'panico_on' }); },

    async avisos_ver(ctx, p) {
      if (!p.alvo) return falha('Marque de quem eu devo mostrar os avisos.');
      const lista = require('../moderacao/nucleo').avisosDe(p.alvo);
      const linhas = lista.slice(-8).reverse().map((a) => `**#${a.id}**  ${S.sep}  ${quando(a.data)}  ${S.sep}  por <@${a.por}>\n${S.filho} ${corta(a.motivo, 120)}`);
      return { ok: true, payload: { embeds: [UI.painel({ trilha: ['Sub dona', 'Avisos'], titulo: `${lista.length} aviso(s)`, descricao: `<@${p.alvo}>\n\n${linhas.join('\n\n') || 'Nenhum aviso.'}` })], allowedMentions: { parse: [] } } };
    },
    async avisos_limpar(ctx, p) {
      const m = await membroDe(ctx, p.alvo); if (!m) return falha('Marque de quem eu devo limpar os avisos.');
      const Mod = require('../moderacao/nucleo'); const lista = Mod.avisosDe(m.id);
      if (!lista.length) return falha('Essa pessoa não tem avisos.');
      Mod.salvarAvisos(m.id, []);
      return bom(`Apaguei os ${lista.length} aviso(s) de **${m.displayName}**.`);
    },
  };
}

module.exports = { instalar, PODER_DE, ROTULO, LEITURA, descrever };
