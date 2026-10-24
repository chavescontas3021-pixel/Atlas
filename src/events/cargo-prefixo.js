const { PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { alterarCargos } = require('../utils/cargos');

const ADD = ['add', 'adicionar', 'dar'];
const REMOVER = ['remover', 'remove', 'tirar', 'rem'];
const SEM_PING = { parse: [], repliedUser: false };

function simples(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const prefixo = db.get('config.prefixo', '!');
    if (!message.content.startsWith(prefixo)) return;

    const partes = message.content.slice(prefixo.length).trim().split(/\s+/);
    if (partes[0].toLowerCase() !== 'cargo') return;

    const uso = `Uso: \`${prefixo}cargo add @membro @cargo\` ou \`${prefixo}cargo remover @membro @cargo\``;
    const palavra = (partes[1] || '').toLowerCase();
    const acao = ADD.includes(palavra) ? 'add' : REMOVER.includes(palavra) ? 'remover' : null;

    try {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await message.reply({ content: '❌ Você precisa da permissão **Gerenciar cargos**.', allowedMentions: SEM_PING });
      }
      if (!acao) return await message.reply({ content: uso, allowedMentions: SEM_PING });

      const texto = message.content;
      const idMembro = [...texto.matchAll(/<@!?(\d+)>/g)].map((m) => m[1])[0];
      const idsCargos = [...texto.matchAll(/<@&(\d+)>/g)].map((m) => m[1]);

      if (!idMembro) return await message.reply({ content: uso, allowedMentions: SEM_PING });

      const alvo = await message.guild.members.fetch(idMembro).catch(() => null);
      if (!alvo) return await message.reply({ content: '❌ Não achei esse membro no servidor.', allowedMentions: SEM_PING });

      let cargos = idsCargos.map((id) => message.guild.roles.cache.get(id)).filter(Boolean);

      // Se não marcou o cargo, tenta pelo nome escrito
      if (!cargos.length) {
        const nome = simples(partes.slice(2).join(' ').replace(/<@[!&]?\d+>/g, ''));
        if (nome) {
          const achado = message.guild.roles.cache.find((r) => simples(r.name) === nome);
          if (achado) cargos = [achado];
        }
      }
      if (!cargos.length) return await message.reply({ content: `❌ Não achei o cargo.\n${uso}`, allowedMentions: SEM_PING });

      const resultado = await alterarCargos(message.member, alvo, cargos, acao);
      await message.reply({ content: resultado, allowedMentions: SEM_PING });
    } catch (erro) {
      console.error('[Cargo] erro no comando de texto:', erro);
      await message.reply({ content: 'Ops, deu erro nesse comando.', allowedMentions: SEM_PING }).catch(() => {});
    }
  },
};
