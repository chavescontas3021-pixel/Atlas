// Verificar manualmente: a staff verifica o membro direto do painel da recepção,
// sem depender do Atlas achar a vaga fechada. Faz o mesmo que a verificação normal:
// cargos, registro da vaga, mensagem de sucesso, "Deem boas-vindas", log e apagar o canal.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder,
  TextInputBuilder, TextInputStyle,
} = require('discord.js');
const db = require('../db');
const U = require('./util');
const F = require('./fluxo');
const S = require('./staff');
const A = require('./aprovacao');
const V = require('../vagas/nucleo');
const L = require('../logs/nucleo');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;
const verificando = new Set(); // evita verificar duas vezes ao mesmo tempo

const botao = (acao, userId, rotulo, emoji, estilo) =>
  new ButtonBuilder().setCustomId(`recmanual:${acao}:${userId}`).setLabel(rotulo).setEmoji(emoji).setStyle(estilo);

// 1) Botão "Verificar manualmente" do painel: pede confirmação
async function abrir(interaction, userId) {
  const linha = new ActionRowBuilder().addComponents(
    botao('ok', userId, 'Confirmar', '✅', ButtonStyle.Success),
    botao('voltar', userId, 'Voltar', '↩️', ButtonStyle.Secondary)
  );
  return interaction.update({
    content:
      `⚠️ Verificar <@${userId}> manualmente?\n` +
      'O Atlas dá o cargo de verificado, tira o "sem vaga", registra a vaga, avisa no canal e apaga a recepção.',
    embeds: [],
    components: [linha],
  });
}

// 2) Confirmou: se já tem personagem, verifica; se não, pede o nome num formulário
async function confirmar(interaction, userId, sessao) {
  if (sessao.personagem) {
    await interaction.deferUpdate();
    return executar(interaction, userId, sessao.personagem, '');
  }
  const modal = new ModalBuilder()
    .setCustomId(`recmanual:modal:${userId}`)
    .setTitle('Verificar manualmente')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('personagem').setLabel('Nome do personagem').setStyle(TextInputStyle.Short).setMaxLength(40).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('apelido').setLabel('Apelido do membro (opcional)').setStyle(TextInputStyle.Short).setMaxLength(32).setRequired(false)
      )
    );
  return interaction.showModal(modal);
}

// "Deem boas-vindas" (mesma mensagem e canal da autorização da staff)
async function boasVindas(guild, member, personagem, nick, staffId) {
  const canalId = A.cfg('canalBoasVindas');
  const canal = canalId ? await guild.channels.fetch(canalId).catch(() => null) : null;
  if (!canal) return;
  const cargo = A.cfg('cargoPing');
  const v = {
    membro: `<@${member.id}>`,
    nick: nick || member.displayName,
    personagem: personagem || '',
    cargo: cargo ? `<@&${cargo}>` : '',
    servidor: guild.name,
    staff: `<@${staffId}>`,
  };
  const texto = String(A.cfg('mensagem', A.MSG_PADRAO)).replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)).trim();
  await canal
    .send({ content: texto, allowedMentions: { roles: cargo ? [cargo] : [], users: [member.id] } })
    .catch((e) => console.error('[Recepção] boas-vindas manual:', e.message));
}

// 3) O trabalho de verdade
async function executar(interaction, userId, personagemInformado, apelido) {
  const resposta = (content) => interaction.editReply({ content, embeds: [], components: [] }).catch(() => {});
  if (verificando.has(userId)) return resposta('⏳ Já estou verificando esse membro, aguarde um instante.');
  verificando.add(userId);
  try {
    const guild = interaction.guild;
    const canal = interaction.channel;
    const sessao = db.get(chave(userId));
    if (!sessao) return resposta('Essa recepção já foi encerrada.');

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      db.remover(chave(userId));
      return resposta('⚪ O membro saiu do servidor.');
    }

    const verificado = U.cfg('cargos.verificado');
    if (!verificado) return resposta('⚠️ O cargo de verificado não está configurado. Configure em `/recepcao cargo` ou no site e tente de novo.');

    const personagem = String(personagemInformado || sessao.personagem || '').trim();
    const motivo = `Verificado manualmente por ${interaction.user.username}`;

    // Cargos
    const problemas = [];
    const semVaga = U.cfg('cargos.semVaga');
    if (semVaga && member.roles.cache.has(semVaga)) {
      await member.roles.remove(semVaga, motivo).catch(() => problemas.push('tirar o cargo de sem vaga'));
    }
    await member.roles.add(verificado, motivo).catch(() => problemas.push('dar o cargo de verificado'));
    if (problemas.length) {
      return resposta(`⚠️ Não consegui ${problemas.join(' e ')}. Confira se o cargo do Atlas está acima desses cargos e tente de novo.`);
    }

    // Apelido (só se a staff digitou um)
    const avisos = [];
    const nickNovo = String(apelido || '').trim();
    if (nickNovo) {
      await member.setNickname(nickNovo.slice(0, 32), motivo).catch(() => avisos.push('⚠️ Não consegui trocar o apelido.'));
    }

    // Registro da vaga
    let vagaRegistrada = false;
    if (personagem) {
      const reg = await V.registrarDaRecepcao(guild, userId, personagem).catch((e) => {
        console.error('[Recepção] registrar vaga (manual):', e.message);
        return null;
      });
      if (reg && reg.ok) vagaRegistrada = true;
      else if (reg && reg.pulou === 'ocupado') {
        avisos.push(`⚠️ **${personagem}** já consta como ocupado por <@${reg.vaga.ocupanteId}> no registro de vagas. Confira com \`/vagaadmin\`.`);
      } else if (reg && reg.pulou === 'ja-registrado') vagaRegistrada = true;
      else if (!reg) avisos.push('⚠️ Não consegui registrar a vaga. Confira com `/vagaadmin`.');
    } else {
      avisos.push('ℹ️ Sem personagem informado: a vaga não foi registrada.');
    }

    // Mensagem de sucesso no canal da recepção (e o canal é apagado depois)
    const seg = Number(U.cfg('apagarSegundos', U.PADROES.apagarSegundos));
    const msg = U.mensagem('sucesso');
    const vars = {
      usuario: `<@${userId}>`, servidor: guild.name, personagem, nick: nickNovo || sessao.nick || '', emoji: sessao.emoji || '',
    };
    let texto = U.preencher(msg.texto, vars);
    if (seg > 0) texto += `\n\n*Este canal será apagado em ${seg} segundos.*`;
    await canal
      .send({
        content: `<@${userId}>`,
        embeds: [new EmbedBuilder().setColor(COR).setTitle(U.preencher(msg.titulo, vars)).setDescription(texto)],
      })
      .catch(() => {});
    if (seg > 0) setTimeout(() => canal.delete('Recepção concluída (verificação manual)').catch(() => {}), seg * 1000);

    // Se havia um pedido esperando na staff, encerra a mensagem dele
    if (sessao.pedido && sessao.pedido.canal && sessao.pedido.msg) {
      const canalStaff = await guild.channels.fetch(sessao.pedido.canal).catch(() => null);
      const msgPedido = canalStaff ? await canalStaff.messages.fetch(sessao.pedido.msg).catch(() => null) : null;
      if (msgPedido && msgPedido.embeds[0]) {
        await msgPedido
          .edit({
            embeds: [EmbedBuilder.from(msgPedido.embeds[0]).addFields({ name: 'Resultado', value: `✅ Verificado manualmente por <@${interaction.user.id}>` })],
            components: [],
          })
          .catch(() => {});
      }
    }

    db.remover(chave(userId));

    await L.enviar(
      guild,
      'membros',
      L.embed('verde', '✅ Verificação manual', `${L.pessoa(member.user)} foi verificado(a) por ${L.pessoa(interaction.user)}.`, [
        ['Personagem', personagem || '—', true],
        ['Vaga registrada', vagaRegistrada ? 'Sim' : 'Não', true],
      ])
    );
    await boasVindas(guild, member, personagem, nickNovo || sessao.nick, interaction.user.id);

    return resposta(`✅ <@${userId}> foi verificado(a) manualmente.${avisos.length ? '\n' + avisos.join('\n') : ''}`);
  } finally {
    verificando.delete(userId);
  }
}

// Roteia os botões "recmanual:abrir|ok|voltar" e o formulário "recmanual:modal"
async function tratar(interaction) {
  const [, acao, userId] = interaction.customId.split(':');
  if (!F.ehStaffRecepcao(interaction)) {
    return interaction.reply({ content: '❌ Só a staff pode usar isso.', flags: EPH });
  }
  const sessao = db.get(chave(userId));
  if (!sessao) {
    const aviso = { content: 'Essa recepção já foi encerrada.', embeds: [], components: [] };
    return interaction.isModalSubmit() ? interaction.reply({ ...aviso, flags: EPH }) : interaction.update(aviso);
  }

  if (acao === 'abrir') return abrir(interaction, userId);
  if (acao === 'voltar') {
    return interaction.update({ content: '', embeds: [S.painelEmbed(userId, sessao)], components: S.botoesPainel(userId) });
  }
  if (acao === 'ok') return confirmar(interaction, userId, sessao);
  if (acao === 'modal') {
    await interaction.deferReply({ flags: EPH });
    return executar(
      interaction,
      userId,
      interaction.fields.getTextInputValue('personagem'),
      interaction.fields.getTextInputValue('apelido')
    );
  }
  return undefined;
}

module.exports = { tratar };
