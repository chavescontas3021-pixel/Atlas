// ATLAS · sub dona · conselhos para ajustar o servidor (só lê e sugere, nunca muda nada sozinha)
const UI = require('../ui/componentes');
const { S, barra } = require('../ui/tema');
const N = require('./nucleo');

const PESO = { alto: 15, medio: 7, baixo: 3 };
const ROTULO = { alto: 'Importante', medio: 'Vale a pena', baixo: 'Detalhe' };

// Permissões que cada poder precisa de mim (o Discord nega sem elas)
const PERM_DO_BOT = {
  ModerateMembers: 'silenciar e advertir', KickMembers: 'expulsar', BanMembers: 'banir e desbanir', ManageMessages: 'limpar e anunciar',
  ManageChannels: 'trancar canais e modo lento', ManageRoles: 'dar e tirar cargos', ManageNicknames: 'mudar apelidos',
};
const PERIGOSAS_EVERYONE = {
  MentionEveryone: 'marcar @everyone', ManageWebhooks: 'criar webhooks', CreateInstantInvite: 'criar convites', UseExternalEmojis: null,
};

function analisar(guild) {
  const a = [];
  const add = (nivel, titulo, dica) => a.push({ nivel, titulo, dica });
  const eu = guild.members.me;

  // 1) O que me falta para poder agir
  if (eu) {
    const falta = Object.entries(PERM_DO_BOT).filter(([p]) => !eu.permissions.has(p));
    if (falta.length) add('alto', 'Faltam permissões para mim', `Sem elas eu não consigo: ${falta.map(([, o]) => o).join(', ')}. Dê esses poderes ao meu cargo.`);
  }
  // 2) Segurança básica
  if (guild.verificationLevel < 2) add('medio', 'Verificação fraca', 'Suba o nível de verificação para "Média" (conta com 5 min de Discord). Barra a maioria dos raids de contas novas.');
  if (guild.explicitContentFilter === 0) add('medio', 'Filtro de conteúdo explícito desligado', 'Ative a verificação de mídia de todos os membros em Configurações do servidor › Moderação.');
  if (guild.mfaLevel === 0) add('medio', 'Staff sem verificação em duas etapas', 'Exija 2FA para moderadores. Se uma conta da staff for roubada, o estrago fica bem menor.');
  const everyone = guild.roles.everyone.permissions;
  const abertas = Object.entries(PERIGOSAS_EVERYONE).filter(([p, o]) => o && everyone.has(p)).map(([, o]) => o);
  if (abertas.length) add('alto', '@everyone com poder demais', `Todo mundo pode: ${abertas.join(', ')}. Tire isso do cargo @everyone.`);

  // 3) Administradores
  const admins = guild.roles.cache.filter((r) => r.permissions.has('Administrator') && !r.managed && r.id !== guild.id);
  const humanos = new Set();
  admins.forEach((r) => r.members.forEach((m) => { if (!m.user.bot) humanos.add(m.id); }));
  if (humanos.size > 3) add('medio', `${humanos.size} pessoas com Administrador`, 'Dê só as permissões que cada pessoa precisa. Administrador ignora todas as proteções de canal.');
  const botsAdmin = guild.members.cache.filter((m) => m.user.bot && m.id !== guild.client.user.id && m.permissions.has('Administrator')).size;
  if (botsAdmin) add('baixo', `${botsAdmin} bot(s) com Administrador`, 'Bots só precisam do que usam. Troque Administrador pelas permissões específicas.');

  // 4) Organização
  if (!guild.rulesChannelId) add('baixo', 'Sem canal de regras definido', 'Ative a Comunidade e escolha o canal de regras: aparece para quem entra.');
  if (!guild.systemChannelId) add('baixo', 'Sem canal de sistema', 'Defina onde o Discord avisa de novos membros e impulsos.');
  const vazias = guild.channels.cache.filter((c) => c.type === 4 && !guild.channels.cache.some((x) => x.parentId === c.id)).size;
  if (vazias) add('baixo', `${vazias} categoria(s) vazia(s)`, 'Apague as categorias que não têm canal nenhum para o servidor ficar mais limpo.');

  // 5) A própria sub dona
  if (!N.alertasCanal()) add('medio', 'Alertas na DM', 'Defina um canal da staff em `/subdona alertas`. Se a sua DM estiver fechada você não recebe os avisos.');
  const vigiasOff = ['vigia_raid', 'vigia_flood', 'vigia_golpe'].filter((p) => N.modo(p) === 'off');
  if (vigiasOff.length) add('alto', 'Vigias desligados', `Desligados: ${vigiasOff.map((p) => N.PODERES[p].nome).join(', ')}. Com você ausente, ninguém barra isso.`);
  if (!N.delegados().length) add('medio', 'Nenhum delegado', 'Escolha 1 ou 2 pessoas de confiança com `/subdona delegar` para mandarem na sub dona quando você sumir.');
  if (N.ticketModo() === 'off') add('baixo', 'Atendimento de tickets desligado', 'Com `/subdona ticket modo:ausente` eu atendo os tickets só quando você estiver fora.');
  if (!N.cfg('resumo', null) || !(N.cfg('resumo').diario || N.cfg('resumo').semanal)) add('baixo', 'Sem resumos automáticos', 'Ligue com `/gestao automatico` para receber um resumo todo dia ou toda segunda.');
  if (!N.cfg('backup_auto', false)) add('baixo', 'Sem backup automático', 'Ligue com `/gestao automatico backup:true`. Guardo as 3 últimas cópias da configuração.');

  // 6) Movimento do servidor (se o módulo de estatísticas estiver ativo)
  try {
    const st = require('../stats/nucleo').agregado(7);
    if (st.saidas > st.entradas && st.saidas >= 5) add('medio', 'Mais gente saindo do que entrando', `Nos últimos 7 dias: ${st.entradas} entradas e ${st.saidas} saídas. Vale um evento, um sorteio ou revisar as boas-vindas.`);
  } catch { /* sem módulo */ }
  return a;
}

function tela(guild) {
  const itens = analisar(guild);
  const nota = Math.max(0, 100 - itens.reduce((s, i) => s + PESO[i.nivel], 0));
  const grupo = (n) => itens.filter((i) => i.nivel === n).map((i) => `**${i.titulo}**\n${S.filho} ${i.dica}`).join('\n\n');
  const campos = ['alto', 'medio', 'baixo'].filter((n) => itens.some((i) => i.nivel === n)).map((n) => ({ nome: ROTULO[n], valor: grupo(n).slice(0, 1020) }));
  return {
    embeds: [UI.painel({
      trilha: ['Sub dona', 'Conselhos'],
      titulo: itens.length ? `Nota do servidor: ${nota}/100` : 'Está tudo certo por aqui',
      descricao: `${barra(nota / 100)}\n${itens.length ? 'Só sugiro. Não mudo nada sozinha.' : 'Não encontrei nada para ajustar.'}`,
      campos,
    })],
    allowedMentions: { parse: [] },
  };
}

module.exports = { analisar, tela };
