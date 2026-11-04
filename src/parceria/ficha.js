// Ficha de parceria: o promotor preenche (no privado com o Atlas ou no servidor)
// e o Atlas publica o convite no canal do tipo escolhido, sem embed.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, PermissionFlagsBits,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const N = require('./nucleo');

const ROTULO = { normal: 'Parceria', everyone: 'Aliança' };
const LIMITE_MSG = 2000; // máximo de uma mensagem do Discord

const tipoValido = (tipo) => Object.prototype.hasOwnProperty.call(ROTULO, tipo);

// O servidor do Atlas (mesma regra dos outros módulos)
const servidorDoAtlas = (client) =>
  client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();

// Confere se a pessoa pode usar a ficha desse tipo e devolve o que for preciso
async function checar(client, userId, tipo) {
  const guild = servidorDoAtlas(client);
  if (!guild) return { erro: 'Não achei o servidor do Atlas.' };

  const membro = guild.members.cache.get(userId) || (await guild.members.fetch(userId).catch(() => null));
  if (!membro) return { erro: 'Você precisa estar no servidor para usar a ficha.', foraDoServidor: true };

  const c = N.conf(tipo);
  if (!c.ativo || !c.canal) return { erro: `A ficha de ${ROTULO[tipo]} está desligada.` };

  const canal = guild.channels.cache.get(c.canal) || (await guild.channels.fetch(c.canal).catch(() => null));
  if (!canal || !canal.isTextBased()) return { erro: 'O canal dessa parceria não existe mais. Avise a staff.' };

  const F = PermissionFlagsBits;
  const permissoes = canal.permissionsFor(membro);
  if (!permissoes || !permissoes.has([F.ViewChannel, F.SendMessages])) {
    return { erro: `Você não tem acesso ao canal de ${ROTULO[tipo]}.` };
  }
  const eu = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  const minhas = eu && canal.permissionsFor(eu);
  if (!minhas || !minhas.has([F.ViewChannel, F.SendMessages])) {
    return { erro: 'O Atlas não consegue escrever nesse canal. Avise a staff.' };
  }
  return { guild, membro, canal };
}

// Mensagem com os botões (só aparece o botão do tipo que a pessoa pode enviar)
async function painel(client, userId) {
  const botoes = [];
  let foraDoServidor = false;
  for (const tipo of Object.keys(ROTULO)) {
    const r = await checar(client, userId, tipo);
    if (r.foraDoServidor) foraDoServidor = true;
    if (r.erro) continue;
    botoes.push(
      new ButtonBuilder()
        .setCustomId(`pficha:abrir:${tipo}:${userId}`)
        .setLabel(ROTULO[tipo])
        .setEmoji(N.TIPOS[tipo].emoji)
        .setStyle(ButtonStyle.Primary)
    );
  }
  if (foraDoServidor) return { content: '❌ Você precisa estar no servidor para usar a ficha.' };
  if (!botoes.length) {
    return { content: '❌ Nenhuma ficha disponível para você agora (desligada ou sem acesso ao canal).' };
  }
  return {
    content: '📝 **Ficha de parceria**\nEscolha o tipo:',
    components: [new ActionRowBuilder().addComponents(...botoes)],
  };
}

// Formulário: dois campos (representante e convite)
function formulario(tipo) {
  return new ModalBuilder()
    .setCustomId(`pficha:modal:${tipo}`)
    .setTitle(`Ficha de ${ROTULO[tipo]}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('representante')
          .setLabel('Representante (ID ou nome de usuário)')
          .setPlaceholder('Quem será marcado. Precisa estar no servidor.')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('convite')
          .setLabel('Convite (texto completo com o link)')
          .setPlaceholder('Cole aqui o texto do convite, com o link do servidor.')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000) // o máximo que o Discord permite num campo
      )
    );
}

// Acha o representante pelo ID, pela menção ou pelo nome de usuário
async function acharMembro(guild, entrada) {
  let t = String(entrada || '').trim();
  const menc = t.match(/^<@!?(\d{15,25})>$/);
  if (menc) t = menc[1];
  if (/^\d{15,25}$/.test(t)) return guild.members.fetch(t).catch(() => null);

  const nome = t.replace(/^@/, '').replace(/#\d{4}$/, '').toLowerCase();
  if (!nome) return null;
  const lista = await guild.members.search({ query: nome.slice(0, 100), limit: 10 }).catch(() => null);
  if (!lista || !lista.size) return null;
  const exato = lista.find(
    (m) =>
      m.user.username.toLowerCase() === nome ||
      String(m.user.globalName || '').toLowerCase() === nome ||
      String(m.displayName || '').toLowerCase() === nome
  );
  return exato || (lista.size === 1 ? lista.first() : null);
}

// Corta o texto em pedaços de até "max" caracteres, sempre que dá na quebra de linha
function dividir(texto, max = LIMITE_MSG) {
  const partes = [];
  let atual = '';
  const fechar = () => {
    if (atual.trim()) partes.push(atual);
    atual = '';
  };
  for (let linha of String(texto).split('\n')) {
    while (linha.length > max) {
      fechar();
      let corte = max;
      const c = linha.charCodeAt(corte - 1);
      if (c >= 0xd800 && c <= 0xdbff) corte -= 1; // não corta no meio de um símbolo
      partes.push(linha.slice(0, corte));
      linha = linha.slice(corte);
    }
    const junto = atual ? `${atual}\n${linha}` : linha;
    if (junto.length > max) {
      fechar();
      atual = linha;
    } else {
      atual = junto;
    }
  }
  fechar();
  return partes;
}

// Valida a ficha e publica. Devolve um texto (erro) ou um objeto { content, allowedMentions } (sucesso).
async function enviar(client, interaction, tipo) {
  const userId = interaction.user.id;
  const r = await checar(client, userId, tipo);
  if (r.erro) return `❌ ${r.erro}`;
  const { guild, canal } = r;

  const texto = interaction.fields.getTextInputValue('convite').trim();
  const entradaRep = interaction.fields.getTextInputValue('representante');

  const link = N.acharConvite(texto);
  if (!link) return '❌ Não achei um link de convite de servidor no texto. Confira se o link está no texto.';

  const rep = await acharMembro(guild, entradaRep);
  if (!rep) {
    return '❌ Não achei esse representante no servidor. Use o ID dele ou o nome de usuário exato. Ele precisa estar no servidor.';
  }
  if (rep.user.bot) return '❌ O representante não pode ser um bot.';
  if (rep.id === userId) return '❌ O representante precisa ser outra pessoa, não você.';

  const servidorParceiro = await N.servidorDoConvite(client, link);
  if (!servidorParceiro) return '❌ Esse convite não está funcionando (expirado ou quebrado). Confira o link.';

  // O ponto entra antes para a mensagem já mostrar o total novo; se nada for enviado, desfaz
  const pontos = N.somarPonto(userId);
  const rank = N.rankDe(userId);

  // Convite em texto puro (sem embed), com o representante marcado no começo
  const cab = `<@${rep.id}>`;
  const partes = dividir(texto, LIMITE_MSG);
  if (partes[0].length + cab.length + 1 <= LIMITE_MSG) partes[0] = `${cab}\n${partes[0]}`;
  else partes.unshift(cab);

  let enviadas = 0;
  try {
    for (const parte of partes) {
      // Só o representante pode ser marcado: @everyone ou cargos escritos no texto não notificam
      await canal.send({ content: parte, allowedMentions: { parse: [], users: [rep.id] } });
      enviadas += 1;
    }
  } catch (erro) {
    console.error(`[Ficha] não consegui enviar o convite (${tipo}):`, erro.message);
    if (!enviadas) {
      N.somarPonto(userId, -1);
      return '❌ Não consegui enviar o convite no canal. Avise a staff.';
    }
    return '⚠️ Só uma parte do convite foi enviada. Avise a staff.';
  }

  // Mensagem de ping (cargo ou @everyone), já configurada em /parceria
  try {
    await canal.send(
      N.montar(tipo, {
        membroId: userId,
        convite: link,
        servidor: guild.name,
        servidorParceiro,
        representanteId: rep.id,
        pontos,
        rank,
      })
    );
  } catch (erro) {
    console.error(`[Ficha] não consegui enviar o ping (${tipo}):`, erro.message);
    return '⚠️ O convite foi enviado, mas não consegui enviar a mensagem de ping. Avise a staff.';
  }

  // Mensagem final na própria conversa (pública, sem emojis): informações + agradecimento
  const nome = ROTULO[tipo].toLowerCase();
  const content = [
    `${ROTULO[tipo]} postada no canal #${canal.name}.`,
    '',
    `Tipo: ${ROTULO[tipo]}`,
    `Servidor parceiro: ${servidorParceiro}`,
    `Promotor: <@${userId}>`,
    `Representante: <@${rep.id}>`,
    `Pontos do promotor: ${pontos} (rank #${rank})`,
    '',
    `Muito obrigado pela ${nome} com ${servidorParceiro}, <@${userId}> e <@${rep.id}>. ` +
      'Que seja o começo de uma caminhada muito boa para os dois servidores.',
  ].join('\n');
  return { content, allowedMentions: { parse: [], users: [userId, rep.id] } };
}

module.exports = { ROTULO, tipoValido, checar, painel, formulario, enviar, dividir };
