// ATLAS · formulário de servidor: perguntas, opções e textos. Para mudar algo, é só editar aqui.
const COR = 0x5b6cff;

const SERVICOS = [
  { v: 'servidor', n: 'Servidor completo', d: 'Estrutura, cargos, decoração e embeds' },
  { v: 'decoracao', n: 'Decoração', d: 'Só decorar canais, cargos e embeds' },
  { v: 'estrutura', n: 'Criação de canais/cargos', d: 'Só criar a estrutura' },
  { v: 'outros', n: 'Outros', d: 'Algo diferente, você descreve' },
];
const TIPOS = [
  { v: 'comunidade', n: 'Comunidade' }, { v: 'house', n: 'House' }, { v: 'loja', n: 'Loja de design' },
];
const PRAZOS = [
  { v: 'urgente', n: 'Urgente (até 3 dias)' }, { v: 'semana', n: 'Até 1 semana' }, { v: 'quinzena', n: 'Até 2 semanas' },
  { v: 'sem_pressa', n: 'Sem pressa' }, { v: 'outro', n: 'Outro prazo…' },
];
const nome = (lista, v) => (lista.find((x) => x.v === v) || {}).n || v;

const PERGUNTAS = {
  servico: 'Qual tipo de serviço você deseja?',
  decors: 'Você já tem decors para os canais/cargos?',
  prazo: 'Qual é o prazo?',
  exemplo: 'Tem exemplo de servidor e embeds?',
  banners: 'Tem banners para as embeds?',
  tipo: 'Qual é o tipo de servidor?',
  lista: 'Você se importaria de fazer uma lista com os canais e cargos que deseja no servidor?',
};
// Respostas "sim" dessas perguntas abrem a coleta de arquivos/texto
const COLETA = {
  decors: 'Envie aqui na conversa os **arquivos** ou o **texto** com as decors (nomes, símbolos, estilo).',
  exemplo: 'Envie aqui na conversa **links** ou **imagens** de servidores e embeds que você gosta.',
  banners: 'Envie aqui na conversa os **arquivos** dos banners.',
  lista: 'Escreva a lista aqui na conversa (um canal ou cargo por linha, do jeito que quiser) ou envie um arquivo **.txt**.',
};
const ROTULO_ANEXO = { decors: 'Decors', exemplo: 'Exemplos', banners: 'Banners', lista: 'Lista de canais e cargos' };

// Perguntas na ordem; as 4 últimas só entram no "Servidor completo"
const etapas = (p) => ['servico', 'decors', 'prazo', ...(p.r && p.r.servico === 'servidor' ? ['exemplo', 'banners', 'tipo', 'lista'] : []), 'revisao'];

const INTRO = (nome) => `Olá, ${nome}. Este formulário reúne o que é preciso para montar o seu servidor. Leva cerca de 3 minutos.\n\n` +
  '▸ Suas respostas ficam salvas e só o responsável pelo pedido as vê.\n' +
  '▸ Enviar o formulário não é contratar: você recebe uma proposta com valor e prazo e decide se aceita.\n' +
  '▸ Os materiais que você enviar (decors, banners, exemplos) são usados apenas neste pedido.\n' +
  '▸ O prazo só começa a contar depois que você aceitar a proposta.';

const STATUS = {
  rascunho: 'Preenchendo', enviado: 'Aguardando análise', ajustes: 'Ajustes pedidos', orcamento: 'Proposta enviada',
  aceito: 'Proposta aceita', andamento: 'Em andamento', entregue: 'Entregue', recusado: 'Recusado', cancelado: 'Cancelado',
};
module.exports = { COR, SERVICOS, TIPOS, PRAZOS, nome, PERGUNTAS, COLETA, ROTULO_ANEXO, etapas, INTRO, STATUS };
