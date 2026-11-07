// Ficha de parceria: o promotor preenche (no privado com o Atlas ou no servidor)
// e o Atlas publica o convite no canal do tipo escolhido, sem embed.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, PermissionFlagsBits,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const N = require('./nucleo');
const C = require('./convites');

const ROTULO = { normal: 'Parceria', everyone: 'Aliança' };

// ===== MUDE AQUI: texto da mensagem final (sem emojis) =====
// Variáveis: {tipo} = Parceria/Aliança, {tipo_minusculo} = parceria/aliança, {canal},
// {servidor_parceiro}, {promotor} (só o nome, sem marcar), {promotor_marcado} (marcado),
// {representante} (marcado), {pontos}, {rank}
const MENSAGEM_FINAL = [
  '{tipo} postada.',
  '',
  'Muito obrigado pela {tipo_minusculo}, {representante}. '
].join('\n');
// =============================================================

const preencher = (texto, vars) =>
  String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
const LIMITE_MSG = 2000; // máximo de uma mensagem do Discord

// ===== Visual (cores e cartões) =====
const COR = { marca: 0xf5a3c7, ok: 0x7bd88f, erro: 0xed4245, aviso: 0xf5c26b };
const RODAPE = 'Atlas • Ficha de parceria';

// Cartão simples de aviso: { embeds: [...] }
const cartao = (cor, titulo, texto) => ({
  embeds: [new EmbedBuilder().setColor(cor).setTitle(titulo).setDescription(texto).setFooter({ text: RODAPE })],
  allowedMentions: { parse: [] },
});
const erro = (texto) => cartao(COR.erro, 'Não foi possível continuar', texto);
const aviso = (texto) => cartao(COR.aviso, 'Atenção', texto);


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

// Painel com os botões (só aparece o botão do tipo que a pessoa pode enviar)
async function painel(client, userId) {
  const botoes = [];
  const opcoes = [];
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
        .setStyle(ButtonStyle.Secondary)
    );
    opcoes.push({
      name: `${N.TIPOS[tipo].emoji} ${ROTULO[tipo]}`,
      value: tipo === 'everyone' ? 'Avisa todo o servidor (@everyone).' : 'Avisa o cargo de parcerias.',
      inline: true,
    });
  }
  if (foraDoServidor) return erro('Você precisa estar no servidor para usar a ficha.');
  if (!botoes.length) return erro('Nenhuma ficha disponível para você agora (desligada ou sem acesso ao canal).');

  const usuario = await client.users.fetch(userId).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(COR.marca)
    .setTitle('Ficha de parceria')
    .setDescription(
      'Divulgue um servidor parceiro em poucos passos.\n\n' +
        '**1.** Escolha o tipo abaixo\n' +
        '**2.** Informe o representante e cole o convite\n' +
        '**3.** O Atlas publica tudo no canal certo'
    )
    .addFields(opcoes)
    .setFooter({ text: RODAPE });
  if (usuario) {
    embed.setAuthor({ name: usuario.globalName || usuario.username, iconURL: usuario.displayAvatarURL() });
  }
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(...botoes)] };
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
  if (r.erro) return erro(r.erro);
  const { guild, canal } = r;

  const texto = interaction.fields.getTextInputValue('convite').trim();
  const entradaRep = interaction.fields.getTextInputValue('representante');

  const link = N.acharConvite(texto);
  if (!link) return erro('Não achei um link de convite de servidor no texto. Confira se o link está no texto.');

  const rep = await acharMembro(guild, entradaRep);
  if (!rep) {
    return erro('Não achei esse representante no servidor. Use o ID dele ou o nome de usuário exato. Ele precisa estar no servidor.');
  }
  if (rep.user.bot) return erro('O representante não pode ser um bot.');
  if (rep.id === userId) return erro('O representante precisa ser outra pessoa, não você.');

  const servidorParceiro = await N.servidorDoConvite(client, link);
  if (!servidorParceiro) return erro('Esse convite não está funcionando (expirado ou quebrado). Confira o link.');

  // O ponto entra antes para a mensagem já mostrar o total novo; se nada for enviado, desfaz
  const pontos = N.somarPonto(userId);
  const rank = N.rankDe(userId);

  // Convite em texto puro (sem embed), com o representante marcado no começo
  const cab = `<@${rep.id}>`;
  const partes = dividir(texto, LIMITE_MSG);
  if (partes[0].length + cab.length + 1 <= LIMITE_MSG) partes[0] = `${cab}\n${partes[0]}`;
  else partes.unshift(cab);

  let enviadas = 0;
  let primeiraMsg = null; // a mensagem com o convite (o vigia usa para linkar a parceria)
  try {
    for (const parte of partes) {
      // Só o representante pode ser marcado: @everyone ou cargos escritos no texto não notificam
      const m = await canal.send({ content: parte, allowedMentions: { parse: [], users: [rep.id] } });
      if (!primeiraMsg) primeiraMsg = m;
      enviadas += 1;
    }
  } catch (erro) {
    console.error(`[Ficha] não consegui enviar o convite (${tipo}):`, erro.message);
    if (!enviadas) {
      N.somarPonto(userId, -1);
      return erro('Não consegui enviar o convite no canal. Avise a staff.');
    }
    return aviso('Só uma parte do convite foi enviada. Avise a staff.');
  }

  // Guarda o convite para o vigia conferir depois (se falhar, a parceria não é afetada)
  try {
    C.registrar({
      codigo: C.codigoDe(link),
      servidor: servidorParceiro,
      promotorId: userId,
      canalId: canal.id,
      msgId: primeiraMsg ? primeiraMsg.id : null,
    });
  } catch (erro) {
    console.error('[Convites] não consegui registrar (ficha):', erro.message);
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
    return aviso('O convite foi enviado, mas não consegui enviar a mensagem de ping. Avise a staff.');
  }

  // Cartão final na própria conversa. O texto vem de MENSAGEM_FINAL (lá em cima).
  const descricao = preencher(MENSAGEM_FINAL, {
    tipo: ROTULO[tipo],
    tipo_minusculo: ROTULO[tipo].toLowerCase(),
    canal: canal.name,
    servidor_parceiro: servidorParceiro,
    promotor: interaction.user.globalName || interaction.user.username,
    promotor_marcado: `<@${userId}>`,
    representante: `<@${rep.id}>`,
    pontos: String(pontos),
    rank: String(rank),
  }).trim().slice(0, 4000);
  const embed = new EmbedBuilder()
    .setColor(COR.ok)
    .setTitle(`${ROTULO[tipo]} publicada`)
    .setDescription(descricao)
    .addFields(
      { name: 'Servidor', value: servidorParceiro, inline: true },
      { name: 'Canal', value: `<#${canal.id}>`, inline: true },
      { name: 'Representante', value: `<@${rep.id}>`, inline: true },
      { name: 'Seus pontos', value: String(pontos), inline: true },
      { name: 'Seu rank', value: `#${rank}`, inline: true }
    )
    .setThumbnail(interaction.user.displayAvatarURL())
    .setFooter({ text: RODAPE });
  return { embeds: [embed], allowedMentions: { parse: [] } };
}

module.exports = { erro, ROTULO, tipoValido, checar, painel, formulario, enviar, dividir };
