// Recepção com autorização: o pedido de verificação vai para um canal da staff,
// e só quando alguém da staff aprova o membro é verificado e a casa dá boas-vindas.
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const db = require('../db');
const U = require('./util');
const V = require('../vagas/nucleo');

const COR = 0xf5a3c7;
const EPH = MessageFlags.Ephemeral;
const chave = (id) => `recepcao.sessoes.${id}`;
const cfg = (k, p) => db.get(`config.recepcao.aprovacao.${k}`, p);

const MSG_PADRAO =
  '{cargo} {membro} chegou na house! 🎉\n' +
  'Deem boas-vindas a **{nick}** (personagem: **{personagem}**)! 💜';

const ativo = () => cfg('ativo', false) === true && !!cfg('canal');

// Só vale para recepções de verdade (as de teste continuam verificando sozinhas)
function usa(userId) {
  const s = db.get(chave(userId));
  return ativo() && !!s && !s.teste;
}

function ehStaff(interaction) {
  const p = interaction.memberPermissions;
  if (p && p.has(PermissionFlagsBits.ManageGuild)) return true;
  const cargo = U.cfg('cargos.staff');
  return !!(cargo && interaction.member && interaction.member.roles.cache.has(cargo));
}

// Botão "Verificar" do membro
async function pedir(interaction) {
  await interaction.deferReply({ flags: EPH });
  const member = interaction.member;
  const sessao = db.get(chave(member.id));
  if (!sessao || !['passos', 'aguardando'].includes(sessao.etapa)) {
    return interaction.editReply('Não achei sua recepção em andamento.');
  }
  if (sessao.etapa === 'aguardando') {
    return interaction.editReply('⏳ Seu pedido já foi enviado para a staff. É só aguardar!');
  }

  const r = await U.procurarVaga(interaction.guild, sessao.personagem, member.id);
  if (r.erro) return interaction.editReply(`⚠️ ${r.erro} Avise a staff.`);
  if (!r.fechada) {
    const id = U.cfg('canais.fechar_vaga');
    return interaction.editReply(
      `❌ Ainda não encontrei a sua vaga de **${sessao.personagem}** fechada em <#${id}>.\n` +
        'Feche a vaga lá (com o nome do personagem) e aperte **Verificar** de novo.',
    );
  }

  const canalStaff = await interaction.guild.channels.fetch(cfg('canal')).catch(() => null);
  if (!canalStaff) return interaction.editReply('⚠️ Não consegui achar o canal da staff. Avise a staff.');

  const embed = new EmbedBuilder()
    .setColor(COR)
    .setTitle('📨 Pedido de verificação')
    .setDescription(`${member} quer ser verificado(a).`)
    .addFields(
      { name: 'Personagem', value: sessao.personagem || '—', inline: true },
      { name: 'Apelido', value: sessao.nick || '—', inline: true },
      { name: 'Vaga fechada', value: r.fechada.url || '—' },
      { name: 'Recepção', value: sessao.canalId ? `<#${sessao.canalId}>` : '—', inline: true },
    );
  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`recaprov:ok:${member.id}`).setLabel('Autorizar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`recaprov:no:${member.id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );
  const cargoStaff = U.cfg('cargos.staff');
  const msg = await canalStaff.send({
    content: cargoStaff ? `<@&${cargoStaff}>` : undefined,
    embeds: [embed],
    components: [botoes],
    allowedMentions: { roles: cargoStaff ? [cargoStaff] : [] },
  });

  db.set(chave(member.id), { ...sessao, etapa: 'aguardando', pedido: { canal: canalStaff.id, msg: msg.id } });
  return interaction.editReply('📨 Pedido enviado para a staff! Assim que alguém autorizar, você será verificado(a). 💜');
}

function vars(member, sessao, staffId) {
  const cargo = cfg('cargoPing');
  return {
    membro: `<@${member.id}>`,
    nick: (sessao && sessao.nick) || member.displayName,
    personagem: (sessao && sessao.personagem) || '',
    cargo: cargo ? `<@&${cargo}>` : '',
    servidor: member.guild.name,
    staff: staffId ? `<@${staffId}>` : '',
  };
}

async function boasVindas(guild, member, sessao, staffId) {
  const canal = cfg('canalBoasVindas') ? await guild.channels.fetch(cfg('canalBoasVindas')).catch(() => null) : null;
  if (!canal) return;
  const cargo = cfg('cargoPing');
  const v = vars(member, sessao, staffId);
  const texto = String(cfg('mensagem', MSG_PADRAO)).replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined ? v[k] : m)).trim();
  await canal.send({
    content: texto,
    allowedMentions: { roles: cargo ? [cargo] : [], users: [member.id] },
  }).catch((e) => console.error('[Recepção] boas-vindas:', e.message));
}

// Botões da staff
async function decidir(interaction) {
  const [, acao, userId] = interaction.customId.split(':');
  if (!ehStaff(interaction)) {
    return interaction.reply({ content: 'Só a staff pode decidir isso.', flags: EPH });
  }
  await interaction.deferUpdate();

  const guild = interaction.guild;
  const sessao = db.get(chave(userId));
  const encerrar = (texto) => interaction.message.edit({
    embeds: [EmbedBuilder.from(interaction.message.embeds[0]).addFields({ name: 'Resultado', value: texto })],
    components: [],
  }).catch(() => {});

  if (!sessao || sessao.etapa !== 'aguardando' || !sessao.pedido || sessao.pedido.msg !== interaction.message.id) {
    return encerrar('⚪ Pedido encerrado (o membro saiu ou mudou o pedido).');
  }
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    db.remover(chave(userId));
    return encerrar('⚪ O membro saiu do servidor.');
  }
  const canalRecepcao = await guild.channels.fetch(sessao.canalId).catch(() => null);

  if (acao === 'no') {
    const { pedido, ...resto } = sessao;
    db.set(chave(userId), { ...resto, etapa: 'passos' });
    if (canalRecepcao) {
      await canalRecepcao.send(`<@${userId}> ❌ A staff ainda não autorizou seu pedido. Confira com a staff e aperte **Verificar** de novo.`).catch(() => {});
    }
    return encerrar(`❌ Recusado por <@${interaction.user.id}>`);
  }

  // Autorizar
  const semVaga = U.cfg('cargos.semVaga');
  const verificado = U.cfg('cargos.verificado');
  const problemas = [];
  if (semVaga && member.roles.cache.has(semVaga)) {
    await member.roles.remove(semVaga, 'Verificado pela staff').catch(() => problemas.push('tirar o cargo de sem vaga'));
  }
  if (verificado) {
    await member.roles.add(verificado, 'Verificado pela staff').catch(() => problemas.push('dar o cargo de verificado'));
  } else {
    problemas.push('dar o cargo de verificado (cargo não configurado)');
  }
  if (problemas.length) {
    return interaction.followUp({ content: `⚠️ Não consegui ${problemas.join(' e ')}. Arrume e aperte Autorizar de novo.`, flags: EPH });
  }

  const reg = await V.registrarDaRecepcao(guild, userId, sessao.personagem).catch((e) => { console.error('[Recepção] registrar vaga:', e.message); return null; });
  if (reg && reg.pulou === 'ocupado') {
    await interaction.followUp({ content: `⚠️ O membro foi verificado, mas **${sessao.personagem}** já consta como ocupado por <@${reg.vaga.ocupanteId}> no registro de vagas. Confira com \`/vagaadmin\`.`, flags: EPH, allowedMentions: { parse: [] } }).catch(() => {});
  }

  const seg = Number(U.cfg('apagarSegundos', U.PADROES.apagarSegundos));
  const msg = U.mensagem('sucesso');
  const v = {
    usuario: `<@${userId}>`, servidor: guild.name, personagem: sessao.personagem || '', nick: sessao.nick || '', emoji: sessao.emoji || '',
  };
  let texto = U.preencher(msg.texto, v);
  if (seg > 0) texto += `\n\n*Este canal será apagado em ${seg} segundos.*`;
  if (canalRecepcao) {
    await canalRecepcao.send({
      content: `<@${userId}>`,
      embeds: [new EmbedBuilder().setColor(COR).setTitle(U.preencher(msg.titulo, v)).setDescription(texto)],
    }).catch(() => {});
    if (seg > 0) setTimeout(() => canalRecepcao.delete('Recepção concluída').catch(() => {}), seg * 1000);
  }
  db.remover(chave(userId));
  await encerrar(`✅ Autorizado por <@${interaction.user.id}>`);
  await boasVindas(guild, member, sessao, interaction.user.id);
}

module.exports = { ativo, usa, pedir, decidir, MSG_PADRAO, cfg };
// fim do arquivo
