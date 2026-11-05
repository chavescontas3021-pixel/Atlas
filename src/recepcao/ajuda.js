// Botão "Solicitar ajuda" da recepção: o membro aperta e o Atlas marca a staff no canal.
// Se a staff já assumiu o atendimento, marca só quem assumiu. Tem um tempo de espera
// entre pedidos para ninguém ficar marcando a staff sem parar.
const { ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const db = require('../db');
const U = require('./util');

const EPH = MessageFlags.Ephemeral;

const TEXTO_PADRAO = '🆘 {staff}, {usuario} precisa de ajuda na recepção!';
const RESPOSTA_PADRAO = '✅ Chamei a staff! Aguarde um pouquinho, alguém vai falar com você aqui no canal. 💜';

const cfg = (k, p) => db.get(`config.recepcao.ajuda.${k}`, p);
const ativo = () => cfg('ativo', true) !== false;
const cooldownMin = () => {
  const n = Number(cfg('cooldownMin', 10));
  return Number.isFinite(n) && n >= 0 ? n : 10;
};
const preencher = (texto, vars) =>
  String(texto).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));

// O botão que entra na primeira mensagem da recepção
const botao = (userId) =>
  new ButtonBuilder()
    .setCustomId(`recepcao:ajuda:${userId}`)
    .setLabel('Solicitar ajuda')
    .setEmoji('🆘')
    .setStyle(ButtonStyle.Success);

async function pedir(interaction, userId) {
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse botão não é para você 💜', flags: EPH });
  }
  if (!ativo()) {
    return interaction.reply({ content: 'O pedido de ajuda está desligado no momento.', flags: EPH });
  }
  const sessao = db.get(`recepcao.sessoes.${userId}`);
  if (!sessao) {
    return interaction.reply({ content: 'Essa recepção já foi encerrada.', flags: EPH });
  }

  // Tempo de espera entre pedidos
  const chave = `recepcao.ajuda.${userId}`;
  const ultimo = Number(db.get(chave, 0)) || 0;
  const espera = cooldownMin() * 60 * 1000;
  const falta = ultimo + espera - Date.now();
  if (falta > 0) {
    const min = Math.max(1, Math.ceil(falta / 60000));
    return interaction.reply({
      content: `⏳ A staff já foi chamada há pouco. Se ainda precisar, aperte de novo em cerca de **${min} min**.`,
      flags: EPH,
    });
  }

  // Quem marcar: quem assumiu o atendimento ou o cargo de staff
  const cargo = U.cfg('cargos.staff');
  const assumiu = sessao.assumido && sessao.assumido.por;
  if (!assumiu && !cargo) {
    return interaction.reply({
      content: '⚠️ A staff ainda não foi configurada para receber pedidos de ajuda. Tente chamar alguém da staff diretamente.',
      flags: EPH,
    });
  }
  const staff = assumiu ? `<@${assumiu}>` : `<@&${cargo}>`;
  const allowedMentions = assumiu ? { users: [assumiu] } : { roles: [cargo] };

  const texto = preencher(cfg('texto', TEXTO_PADRAO) || TEXTO_PADRAO, { staff, usuario: `<@${userId}>` });
  try {
    await interaction.channel.send({ content: texto.slice(0, 1900), allowedMentions });
  } catch (e) {
    console.error('[Recepção] pedido de ajuda:', e.message);
    return interaction.reply({ content: '⚠️ Não consegui chamar a staff agora. Tente de novo em instantes.', flags: EPH });
  }
  db.set(chave, Date.now());
  const resposta = cfg('resposta', RESPOSTA_PADRAO) || RESPOSTA_PADRAO;
  return interaction.reply({ content: resposta.slice(0, 1900), flags: EPH });
}

module.exports = { botao, pedir, ativo, TEXTO_PADRAO, RESPOSTA_PADRAO };
