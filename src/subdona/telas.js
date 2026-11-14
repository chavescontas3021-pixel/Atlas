// ATLAS · sub dona · telas (status, diário, recados)
const UI = require('../ui/componentes');
const { S, quando, corta } = require('../ui/tema');
const N = require('./nucleo');
const A = require('./acoes');

const POR_PAGINA = 6;
const SEM_PING = { parse: [] };

async function telaStatus(client) {
  const pai = await N.paiId(client);
  const aus = N.ausencia();
  const poderes = Object.entries(N.PODERES).map(([id, p]) => `${N.modo(id) === 'auto' ? S.ponto : N.modo(id) === 'confirma' ? '◐' : S.vazio}  **${p.nome}**  ${S.sep}  ${N.MODOS[N.modo(id)]}`).join('\n');
  const dele = N.delegados();
  return {
    embeds: [UI.painel({
      trilha: ['Sub dona'],
      titulo: aus ? 'O pai está ausente. A sub dona está no comando.' : 'O pai está presente',
      descricao: aus
        ? `${aus.motivo ? `Motivo: ${aus.motivo}\n` : ''}Desde ${quando(aus.desde)}${aus.ate ? `  ${S.sep}  volta ${quando(aus.ate)}` : ''}`
        : 'A sub dona obedece ordens do pai e dos delegados, e tudo fica no diário.',
      campos: [
        { nome: 'Pai', valor: pai ? `<@${pai}>` : 'não encontrado', lado: true },
        { nome: 'Delegados', valor: dele.length ? dele.map((d) => `<@${d}>`).join(' ') : 'ninguém', lado: true },
        { nome: 'Recados', valor: String(N.recados().length), lado: true },
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
  const p = Math.min(Math.max(0, pagina), total - 1);
  const itens = lista.slice(p * POR_PAGINA, (p + 1) * POR_PAGINA);
  const linhas = itens.map((r) => `<@${r.de}>  ${S.sep}  ${quando(r.em)}  ${S.sep}  [ir à mensagem](https://discord.com/channels/${r.guildId}/${r.canalId}/${r.msgId})\n${S.filho} ${corta(r.texto, 160)}`);
  return {
    embeds: [UI.painel({ trilha: ['Sub dona', 'Recados'], titulo: 'Quem procurou você', descricao: linhas.length ? linhas.join('\n\n') : 'Nenhum recado.', rodape: `${lista.length} recado(s)  ·  /subdona recados limpar:true` })],
    components: [UI.paginacao('sd:recados', p, total)].filter(Boolean),
    allowedMentions: SEM_PING,
  };
}

module.exports = { telaStatus, telaDiario, telaRecados };
