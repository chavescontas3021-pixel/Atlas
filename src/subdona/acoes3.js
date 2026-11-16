// ATLAS · sub dona · ordens extras 2: consultas e controles (sem confirmação; só pai e delegados chegam aqui)
// Instalado por acoes.js. Devolvem { ok, texto } ou { ok, payload } (uma tela pronta).
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');
const N = require('./nucleo');

const DIA = 24 * 3600 * 1000;
const LEITURA = ['resumo', 'conselho', 'status_sd', 'caixa_ver', 'recados_ver', 'diario_ver', 'membro_info', 'ausentar', 'voltar_ordem', 'canal_livre', 'canal_livre_tirar', 'canais_livres_ver', 'vigia_modo'];
const ROTULO = Object.fromEntries(LEITURA.map((a) => [a, a.replace(/_/g, ' ')]));
const VIGIAS = { raid: 'vigia_raid', flood: 'vigia_flood', golpe: 'vigia_golpe' };
const SEM_PING = { parse: [] };

function instalar({ falha, bom, membroDe }) {
  const tela = (payload) => ({ ok: true, payload: { ...payload, allowedMentions: SEM_PING } });
  return {
    async resumo(ctx, p) {
      const dias = p.dias || 1;
      return tela(require('./resumo').montar({ desde: Date.now() - dias * DIA, titulo: dias === 1 ? 'Resumo do dia' : dias === 7 ? 'Resumo da semana' : `Resumo de ${dias} dias` }));
    },
    async conselho(ctx) { return tela(require('./conselho').tela(ctx.guild)); },
    async status_sd(ctx) { return tela(await require('./telas').telaStatus(ctx.client)); },
    async recados_ver() { return tela(require('./telas').telaRecados(0)); },
    async diario_ver() { return tela(require('./telas').telaDiario(0)); },
    async caixa_ver() {
      const l = N.caixa(); const mes = l.filter((x) => x.em > Date.now() - 30 * DIA);
      const soma = (a) => a.reduce((s, x) => s + (Number(x.valor) || 0), 0).toLocaleString('pt-BR');
      const ult = l.slice(-5).reverse().map((x) => `<@${x.pagador}>  ${S.sep}  ${Number(x.valor).toLocaleString('pt-BR')}  ${S.sep}  ${quando(x.em)}${x.ticket ? `  ${S.sep}  ticket #${x.ticket}` : ''}`);
      return tela({ embeds: [UI.painel({ trilha: ['Sub dona', 'Caixa'], titulo: `${soma(mes)} sonhos nos últimos 30 dias`, descricao: ult.length ? ult.join('\n') : 'Nenhum pagamento registrado ainda.', campos: [{ nome: 'Total', valor: `${soma(l)} sonhos em ${l.length} pagamento(s)`, lado: true }, { nome: 'Cobranças abertas', valor: String(N.cobrancas().filter((c) => c.status === 'aberta').length), lado: true }], rodape: 'Só pagamentos feitos dentro de tickets entram no caixa' })] });
    },
    async membro_info(ctx, p) {
      const m = await membroDe(ctx, p.alvo); if (!m) return falha('Marque de quem eu devo mostrar a ficha.');
      let msgs = 0; try { msgs = require('../stats/nucleo').totalDoMembro(m.id); } catch { /* sem stats */ }
      let lista = false; try { lista = require('../blacklist/nucleo').esta(m.id); } catch { /* sem blacklist */ }
      const avisos = require('../moderacao/nucleo').avisosDe(m.id).length;
      const cargos = m.roles.cache ? [...m.roles.cache.values()].filter((r) => r.id !== ctx.guild.id).sort((a, b) => b.position - a.position).slice(0, 6).map((r) => `<@&${r.id}>`).join(' ') : '';
      return tela({ embeds: [UI.painel({ trilha: ['Sub dona', 'Membro'], titulo: m.displayName, descricao: `<@${m.id}>`, campos: [
        { nome: 'Conta criada', valor: quando(m.user.createdTimestamp, 'D'), lado: true }, { nome: 'Entrou', valor: m.joinedTimestamp ? quando(m.joinedTimestamp, 'D') : '?', lado: true },
        { nome: 'Mensagens', valor: String(msgs), lado: true }, { nome: 'Avisos', valor: String(avisos), lado: true }, { nome: 'Blacklist', valor: lista ? 'sim' : 'não', lado: true },
        { nome: 'Cargos', valor: cargos || 'nenhum' }] })] });
    },
    async ausentar(ctx, p) {
      N.ausentar({ motivo: p.motivo || '', horas: p.horas || null });
      return bom(`Ausência ligada${p.horas ? ` por ${p.horas} h` : ''}${p.motivo ? ` (${p.motivo})` : ''}. Eu cuido de tudo. Quando voltar, é só dizer "atlas, voltei".`);
    },
    async voltar_ordem(ctx) {
      const aus = N.ausencia(); const desde = aus ? aus.desde : Date.now() - DIA;
      const feitos = N.diario().filter((d) => d.em >= desde && d.ausencia).length; const rec = N.recados().length;
      N.voltar();
      const t = require('./resumo').montar({ desde, titulo: aus ? 'Bem-vindo de volta. Isto é o que perdeu.' : 'Bem-vindo de volta', trilha: 'Ao voltar' });
      return tela({ ...t, components: [UI.botoes([{ id: 'sd:diarioa:0', label: `Ver o que fiz (${feitos})` }, { id: 'sd:recados:0', label: `Ver recados (${rec})` }])] });
    },
    async canal_livre(ctx, p) {
      const c = p.canalAlvo || ctx.canal; N.setCanaisLivres([...N.canaisLivres(), c.id]);
      return bom(`Pronto: ${c} agora é canal movimentado. Ali eu não castigo por flood (golpes e spam de menção continuam vigiados).`);
    },
    async canal_livre_tirar(ctx, p) {
      const c = p.canalAlvo || ctx.canal; N.setCanaisLivres(N.canaisLivres().filter((x) => x !== c.id));
      return bom(`${c} voltou a ser vigiado contra flood.`);
    },
    async canais_livres_ver() {
      const l = N.canaisLivres();
      return bom(l.length ? `Canais movimentados: ${l.map((i) => `<#${i}>`).join(' ')}` : 'Nenhum canal movimentado definido.');
    },
    async vigia_modo(ctx, p) {
      const poder = VIGIAS[p.vigia]; if (!poder || !['auto', 'confirma', 'off'].includes(p.modo)) return falha('Diga qual vigia (raid, flood ou golpe) e se é para ligar ou desligar.');
      N.setModo(poder, p.modo);
      return bom(`Vigia de **${p.vigia}**: ${N.MODOS[p.modo]}.`);
    },
  };
}

module.exports = { instalar, PODER_DE: {}, ROTULO, LEITURA };
