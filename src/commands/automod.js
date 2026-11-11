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

const tem = (lista, n) => lista.map(A.normalizar).includes(n);
const sem = (lista, n) => lista.filter((x) => A.normalizar(x) !== n);

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
        .addStringOption((o) =>
          o.setName('nivel').setDescription('Grave = apaga e adverte; Leve = só apaga e avisa').addChoices(
            { name: 'Grave (apaga + advertência)', value: 'grave' },
            { name: 'Leve (apaga e avisa)', value: 'leve' }
          )
        )
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove uma palavra proibida (também libera as que já vêm de fábrica)')
        .addStringOption((o) => o.setName('palavra').setDescription('Palavra ou frase').setRequired(true).setMaxLength(60))
    )
    .addSubcommand((s) =>
      s
        .setName('leve')
        .setDescription('Define o que acontece com palavras de nível leve (conteúdo sexual leve)')
        .addStringOption((o) =>
          o.setName('modo').setDescription('O que fazer').setRequired(true).addChoices(
            { name: 'Só apagar (3 em 1 hora viram advertência)', value: 'apagar' },
            { name: 'Advertir sempre', value: 'advertir' }
          )
        )
    )
    .addSubcommand((s) =>
      s
        .setName('nomes')
        .setDescription('Liga ou desliga a checagem de nomes e apelidos')
        .addBooleanOption((o) => o.setName('ativo').setDescription('Sim = checa nomes; Não = ignora').setRequired(true))
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
            'Quem tem permissão de moderar (Administrador, Gerenciar Servidor, Gerenciar Mensagens ou Castigar membros) nunca é bloqueado, **exceto** se estiver na blacklist.'
        )
        .addFields(
          { name: 'Palavras extras', value: `${A.extras().length} graves, ${A.extrasLeves().length} leves`, inline: true },
          { name: 'Liberadas da lista padrão', value: String(A.liberadas().length), inline: true },
          { name: 'Nível leve', value: A.modoLeve() === 'advertir' ? 'Advertir sempre' : 'Só apagar (3 em 1 hora = advertência)', inline: true },
          { name: 'Checagem de nomes', value: A.nomesAtivo() ? 'Ligada' : 'Desligada', inline: true },
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

    if (sub === 'leve') {
      const modo = interaction.options.getString('modo');
      db.set('config.automod.leve', modo);
      return responder(
        interaction,
        modo === 'advertir'
          ? '✅ Palavras leves agora dão **advertência** sempre.'
          : '✅ Palavras leves agora só **apagam a mensagem**. Com 3 em 1 hora, o membro leva 1 advertência.'
      );
    }

    if (sub === 'nomes') {
      const ativo = interaction.options.getBoolean('ativo');
      db.set('config.automod.nomes', ativo);
      return responder(interaction, ativo ? '✅ Checagem de nomes **ligada**.' : '✅ Checagem de nomes **desligada**.');
    }

    if (sub === 'adicionar') {
      const palavra = interaction.options.getString('palavra').trim().toLowerCase();
      const nivel = interaction.options.getString('nivel') || 'grave';
      const n = A.normalizar(palavra);
      if (n.length < 3) return responder(interaction, '❌ Escreva uma palavra com pelo menos 3 letras.');

      if (tem(A.liberadas(), n)) {
        db.set('config.automod.liberadas', sem(A.liberadas(), n));
        return responder(interaction, '✅ Palavra da lista padrão voltou a ser bloqueada.');
      }
      if (A.naListaPadrao(palavra)) return responder(interaction, 'ℹ️ Essa já está na lista padrão.');
      if (tem(A.extras(), n) || tem(A.extrasLeves(), n)) return responder(interaction, 'ℹ️ Essa palavra já está na sua lista.');

      if (nivel === 'leve') db.set('config.automod.extrasLeves', [...A.extrasLeves(), palavra]);
      else db.set('config.automod.extras', [...A.extras(), palavra]);
      return responder(interaction, `✅ Adicionada (${nivel}): \`${palavra}\`.`);
    }

    if (sub === 'remover') {
      const palavra = interaction.options.getString('palavra').trim().toLowerCase();
      const n = A.normalizar(palavra);
      if (tem(A.extras(), n)) {
        db.set('config.automod.extras', sem(A.extras(), n));
        return responder(interaction, `✅ Removida: \`${palavra}\`.`);
      }
      if (tem(A.extrasLeves(), n)) {
        db.set('config.automod.extrasLeves', sem(A.extrasLeves(), n));
        return responder(interaction, `✅ Removida: \`${palavra}\`.`);
      }
      if (A.naListaPadrao(palavra)) {
        if (!tem(A.liberadas(), n)) db.set('config.automod.liberadas', [...A.liberadas(), palavra]);
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
      if (!achou) return responder(interaction, '✅ Esse texto passaria normalmente.');
      const efeito = achou.advertir
        ? 'apaga a mensagem e dá **advertência**'
        : A.modoLeve() === 'advertir'
          ? 'apaga a mensagem e dá **advertência** (nível leve, modo "advertir sempre")'
          : 'apaga a mensagem e avisa (**sem advertência**, a não ser que repita 3 vezes em 1 hora)';
      return responder(interaction, `🚫 Seria **bloqueado**.\nCategoria: **${achou.categoria}** (termo: \`${achou.termo}\`)\nEfeito: ${efeito}.`);
    }
  },
};
