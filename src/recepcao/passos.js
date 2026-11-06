// A mensagem de passos da recepção (o que o membro precisa fazer depois de escolher o nome e o emoji).
// Usada pelo botão "Passos" do painel da staff.
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const U = require('./util');

const COR = 0xf5a3c7;

// O texto (título e descrição) é o mesmo configurado em /recepcao mensagem ou no site (mensagem "passos")
function embedPassos(nomeServidor, userId, sessao) {
  const msg = U.mensagem('passos');
  const vars = {
    usuario: `<@${userId}>`,
    servidor: nomeServidor,
    personagem: (sessao && sessao.personagem) || '',
    nick: (sessao && sessao.nick) || '',
    emoji: (sessao && sessao.emoji) || '',
  };
  const lista = U.PASSOS.map((p, i) => {
    const id = U.cfg(`canais.${p.id}`);
    return `**${i + 1}. ${p.nome}** — ${id ? `<#${id}>` : '*canal não configurado*'}\n${p.desc}`;
  }).join('\n\n');

  return new EmbedBuilder()
    .setColor(COR)
    .setTitle(U.preencher(msg.titulo, vars))
    .setDescription(`${U.preencher(msg.texto, vars)}\n\n${lista}`);
}

// Botões da mensagem de passos (só funcionam quando o membro já está na etapa dos passos)
function botoesPassos(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`recepcao:verificar:${userId}`).setLabel('Verificar').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`recepcao:trocar:${userId}`).setLabel('Trocar personagem').setEmoji('🔄').setStyle(ButtonStyle.Secondary)
  );
}

module.exports = { embedPassos, botoesPassos };
