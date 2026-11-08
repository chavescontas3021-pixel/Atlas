const { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const A = require('../automod/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: { parse: [] } });

// Liga/desliga um item numa lista salva (retorna true se ficou na lista)
function alternar(chave, valor) {
  const lista = db.get(`config.automod.${chave}`, []);
  const atual = Array.isArray(lista) ? [...lista] : [];
  const i = atual.indexOf(valor);
  if (i >= 0) atual.splice(i, 1);
  else atual.push(valor);
  db.set(`config.automod.${chave}`, atual);
  return i < 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Bloqueio automático de palavras proibidas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra como o automod está configurado'))
    .addSubcommand((s) =>
      s
        .setName('ligar')
        .setDescription('Liga ou desliga o automod')
        .addBooleanOption((o) => o.setName('ativo').setDescription('Sim = ligado; Não = desligado').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Adiciona uma palavra ou frase proibida')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra ou frase').setRequired(true).setMaxLength(60))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove uma palavra proibida (também libera as que já vêm de fábrica)')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra ou frase').setRequired(true).setMaxLength(60))
    )
    .addSubcommand((s) =>
      s
        .setName('ignorarcanal')
        .setDescription('Canal onde o automod não age (repita para desfazer)')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal ou categoria').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('isentarcargo')
        .setDescription('Cargo que o automod ignora (repita para desfazer)')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('testar')
        .setDescription('Testa se um texto seria bloqueado (não pune ninguém)')
        .addStringOption((o) => o.setName('texto').setDescription('Texto para testar').setRequired(true).setMaxLength(500))
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const canais = A.canaisIgnorados().map((c) => `<#${c}>`).join(', ') || 'nenhum';
      const cargos = A.cargosIsentos().map((c) => `<@&${c}>`).join(', ') || 'nenhum';
      const emb = new EmbedBuilder()
        .setColor(A.ativo() ? 0x2ecc71 : 0x99aab5)
        .setTitle('🤖 Automod')
        .setDescription(
          `${A.ativo() ? '🟢 Ligado' : '🔴 Desligado'}\n` +
            'Quem tem permissão de moderar (Administrador, Gerenciar Servidor, Gerenciar Mensagens ou Castigar membros) nunca é bloqueado.'
        )
        .addFields(
          { name: 'Palavras extras', value: String(A.extras().length), inline: true },
          { name: 'Liberadas da lista padrão', value: String(A.liberadas().length), inline: true },
          { name: 'Canais ignorados', value: canais.slice(0, 1000) },
          { name: 'Cargos isentos', value: cargos.slice(0, 1000) }
        );
      return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: { parse: [] } });
    }

    if (sub === 'ligar') {
      const ativo = interaction.options.getBoolean('ativo');
      db.set('config.automod.ativo', ativo);
      return responder(interaction, ativo ? '✅ Automod **ligado**.' : '✅ Automod **desligado**.');
    }

    if (sub === 'adicionar') {
      const palavra = interaction.options.getString('palavra').trim().toLowerCase();
      const n = A.normalizar(palavra);
      if (n.length < 3) return responder(interaction, '❌ Escreva uma palavra com pelo menos 3 letras.');
      if (A.naListaPadrao(palavra) && !A.liberadas().map(A.normalizar).includes(n)) {
        return responder(interaction, 'ℹ️ Essa já está na lista padrão.');
      }
      if (A.liberadas().map(A.normalizar).includes(n)) {
        db.set('config.automod.liberadas', A.liberadas().filter((x) => A.normalizar(x) !== n));
        return responder(interaction, '✅ Palavra da lista padrão voltou a ser bloqueada.');
      }
      if (A.extras().map(A.normalizar).includes(n)) return responder(interaction, 'ℹ️ Essa palavra já está na sua lista.');
      db.set('config.automod.extras', [...A.extras(), palavra]);
      return responder(interaction, `✅ Adicionada: \`${palavra}\`.`);
    }

    if (sub === 'remover') {
      const palavra = interaction.options.getString('palavra').trim().toLowerCase();
      const n = A.normalizar(palavra);
      const extras = A.extras();
      if (extras.map(A.normalizar).includes(n)) {
        db.set('config.automod.extras', extras.filter((x) => A.normalizar(x) !== n));
        return responder(interaction, `✅ Removida: \`${palavra}\`.`);
      }
      if (A.naListaPadrao(palavra)) {
        if (!A.liberadas().map(A.normalizar).includes(n)) db.set('config.automod.liberadas', [...A.liberadas(), palavra]);
        return responder(interaction, `✅ \`${palavra}\` foi liberada (era da lista padrão).`);
      }
      return responder(interaction, '❌ Não encontrei essa palavra na lista.');
    }

    if (sub === 'ignorarcanal') {
      const canal = interaction.options.getChannel('canal');
      const ficou = alternar('canaisIgnorados', canal.id);
      return responder(interaction, ficou ? `✅ O automod não age mais em ${canal}.` : `✅ O automod voltou a agir em ${canal}.`);
    }

    if (sub === 'isentarcargo') {
      const cargo = interaction.options.getRole('cargo');
      const ficou = alternar('cargosIsentos', cargo.id);
      return responder(interaction, ficou ? `✅ ${cargo} agora é isento do automod.` : `✅ ${cargo} voltou a ser vigiado pelo automod.`);
    }

    if (sub === 'testar') {
      const achou = A.detectar(interaction.options.getString('texto'));
      return responder(
        interaction,
        achou
          ? `🚫 Seria **bloqueado**. Categoria: **${achou.categoria}** (termo: \`${achou.termo}\`).`
          : '✅ Esse texto passaria normalmente.'
      );
    }
  },
};
