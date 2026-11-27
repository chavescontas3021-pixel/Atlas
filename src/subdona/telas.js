const UI = require('../ui/componentes');
const { S, quando, corta } = require('../ui/tema');
const N = require('./nucleo');
const A = require('./acoes');

const POR_PAGINA = 6;
const SEM_PING = { parse: [] };

async function telaStatus(client) {
  const responsavel = await N.responsavelId(client);
  const aus = N.ausencia();
  const poderes = Object.entries(N.PODERES).map(([id, p]) => `${N.modo(id) === 'auto' ? S.ponto : N.modo(id) === 'confirma' ? '◐' : S.vazio}  **${p.nome}**  ${S.sep}  ${N.MODOS[N.modo(id)]}`).join('\n');
  const dele = N.delegados();
  return {
    embeds: [UI.painel({
      trilha: ['Sub dona'],
      titulo: !N.ativo() ? 'Modo sub dona DESLIGADO' : aus ? 'O responsável está ausente. A sub dona está no comando.' : 'O responsável está presente',
      descricao: aus
        ? `${aus.motivo ? `Motivo: ${aus.motivo}\n` : ''}Desde ${quando(aus.desde)}${aus.ate ? `  ${S.sep}  volta ${quando(aus.ate)}` : ''}`
        : 'A sub dona obedece ordens do responsável e dos delegados, e tudo fica no diário.',
      campos: [
        { nome: 'Responsável', valor: responsavel ? `<@${responsavel}>` : 'não encontrado', lado: true },
        { nome: 'Delegados', valor: dele.length ? dele.map((d) => `<@${d}>`).join(' ') : 'ninguém', lado: true },
        { nome: 'Recados', valor: String(N.recados().length), lado: true },
        { nome: 'Tickets', valor: { sempre: 'atende sempre', ausente: 'atende com o responsável ausente', off: 'desligado' }[N.ticketModo()], lado: true },
        { nome: 'Alertas', valor: N.alertasCanal() ? `<#${N.alertasCanal()}>` : 'DM do responsável', lado: true },
        { nome: 'Canais movimentados', valor: N.canaisLivres().length ? N.canaisLivres().map((c) => `<#${c}>`).join(' ') : 'nenhum', lado: true },
        { nome: 'Pânico', valor: require('./vigia').estadoPanico() ? 'ATIVO' : 'desligado', lado: true },
        { nome: 'Poderes', valor: `${S.ponto} automático  ◐ pede confirmação  ${S.vazio} desligado\n\n${poderes}` },
      ],
      rodape: 'Ordens: "atlas, silencia @fulano 10 min spam"  ·  /subdona poder para mudar',
    })],
    allowedMentions: SEM_PING,
  };
}

function telaDiario(pagina = 0, soAusencia = false) {
  const lista = N.diario().filter((d) => !soAusencia || d.ausencia).reverse();
  const total = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const p = Math.min(Math.max(0, pagina), total - 1);
  const itens = lista.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
  const linhas = itens.map((d) => `**#${d.id}**  ${S.sep}  ${A.ROTULO[d.acao] || d.acao}  ${S.sep}  ${quando(d.em)}${d.desfeito ? '  ·  desfeito' : ''}\n${S.filho} por <@${d.executor}>${d.alvo ? ` em <@${d.alvo}>` : ''}${d.texto ? ` — ${corta(d.texto, 90)}` : ''}${d.origem === 'auto' ? '  (sozinha)' : ''}`);
  return {
    embeds: [UI.painel({ trilha: ['Sub dona', 'Diário'], titulo: soAusencia ? 'O que fiz enquanto você esteve fora' : 'O que a sub dona fez', descricao: linhas.length ? linhas.join('\n\n') : 'Ainda não fiz nada.', rodape: `${lista.length} registro(s)` })],
    components: [UI.paginacao(`sd:diario${soAusencia ? 'a' : ''}`, p, total)].filter(Boolean),
    allowedMentions: SEM_PING,
  };
}

function telaRecados(pagina = 0) {
  const lista = N.recados().slice().reverse();
  const total = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const p = Math.min(Math.max(0, Number(pagina) || 0), total - 1);
  const itens = lista.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
  const linhas = itens.map((r) => {
    const link = r.guildId && r.canalId && r.msgId ? `  ${S.sep}  [ir à mensagem](https://discord.com/channels/${r.guildId}/${r.canalId}/${r.msgId})` : '';
    return `${r.de ? `<@${r.de}>` : 'Alguém'}  ${S.sep}  ${quando(r.em || Date.now())}${link}\n${S.filho} ${corta(r.texto || '(só marcou você)', 160)}`;
  });
  return {
    embeds: [UI.painel({ trilha: ['Sub dona', 'Recados'], titulo: 'Quem procurou você', descricao: (linhas.join('\n\n') || 'Nenhum recado.').slice(0, 3900), rodape: `${lista.length} recado(s)  ·  /subdona recados limpar:true` })],
    components: [UI.paginacao('sd:recados', p, total)].filter(Boolean),
    allowedMentions: SEM_PING,
  };
}

module.exports = { telaStatus, telaDiario, telaRecados };
