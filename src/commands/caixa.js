const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../subdona/nucleo');
const Sonhos = require('../subdona/sonhos');
const UI = require('../ui/componentes');
const { S, quando, corta } = require('../ui/tema');

const SEM_PING = { parse: [] };
const fmt = (n) => Number(n).toLocaleString('pt-BR');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caixa')
    .setDescription('Pagamentos em sonhos (Loritta) recebidos pelo pai')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('extrato').setDescription('Últimos pagamentos e o total'))
    .addSubcommand((s) => s.setName('cobrar').setDescription('Cria uma cobrança: quando a pessoa pagar, a Atlas confirma e entrega o cargo')
      .addUserOption((o) => o.setName('membro').setDescription('Quem vai pagar').setRequired(true))
      .addIntegerOption((o) => o.setName('valor').setDescription('Valor em sonhos').setRequired(true).setMinValue(1))
      .addStringOption((o) => o.setName('motivo').setDescription('Pelo que é').setMaxLength(120))
      .addRoleOption((o) => o.setName('cargo').setDescription('Cargo entregue quando pagar')))
    .addSubcommand((s) => s.setName('cobrancas').setDescription('Lista as cobranças'))
    .addSubcommand((s) => s.setName('cancelar').setDescription('Cancela uma cobrança aberta')
      .addIntegerOption((o) => o.setName('numero').setDescription('Número da cobrança').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('canal').setDescription('Só olhar pagamentos neste canal (vazio = todos)')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('loritta').setDescription('Muda o ID da Loritta (se você usa outra versão dela)')
      .addStringOption((o) => o.setName('id').setDescription('ID do bot').setRequired(true).setMaxLength(25)))
    .addSubcommand((s) => s.setName('amostras').setDescription('Mensagens da Loritta que citaram o pai (para ajustar o leitor)'))
    .addSubcommand((s) => s.setName('teste').setDescription('Testa se um texto seria lido como pagamento')
      .addStringOption((o) => o.setName('texto').setDescription('Cole a mensagem da Loritta (use a menção, ex.: <@123>)').setRequired(true).setMaxLength(1000))),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    if (!(await N.ehPai(client, interaction.user.id))) return interaction.reply(UI.erro('O caixa é só do pai.'));
    const sub = interaction.options.getSubcommand();

    if (sub === 'extrato') {
      const l = N.caixa().slice().reverse();
      const total = l.reduce((s, x) => s + x.valor, 0);
      const linhas = l.slice(0, 10).map((x) => `**${fmt(x.valor)}**  ${S.sep}  <@${x.pagador}>  ${S.sep}  ${quando(x.em)}${x.cobranca ? `  ${S.sep}  cobrança #${x.cobranca}` : ''}`);
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Caixa'], titulo: `${fmt(total)} sonhos no total`, descricao: linhas.join('\n') || 'Nenhum pagamento ainda.', rodape: `${l.length} pagamento(s) registrados` })], flags: UI.EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'cobrar') {
      const m = interaction.options.getUser('membro');
      const cargo = interaction.options.getRole('cargo');
      const id = Sonhos.novaCobranca({ membro: m.id, valor: interaction.options.getInteger('valor'), motivo: interaction.options.getString('motivo'), cargo: cargo ? cargo.id : null });
      return interaction.reply({ ...UI.ok(`Cobrança **#${id}** criada: ${m} paga **${fmt(interaction.options.getInteger('valor'))} sonhos** para você pela Loritta${cargo ? ` e recebe ${cargo}` : ''}. Quando o pagamento aparecer, eu confirmo.`), allowedMentions: SEM_PING });
    }

    if (sub === 'cobrancas') {
      const l = N.cobrancas().slice().reverse().slice(0, 10);
      const linhas = l.map((c) => `**#${c.id}**  ${S.sep}  <@${c.membro}>  ${S.sep}  ${fmt(c.valor)}  ${S.sep}  ${c.status}${c.motivo ? `  ${S.sep}  ${corta(c.motivo, 40)}` : ''}`);
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Caixa', 'Cobranças'], titulo: 'Cobranças', descricao: linhas.join('\n') || 'Nenhuma cobrança.' })], flags: UI.EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'cancelar') {
      const l = N.cobrancas();
      const c = l.find((x) => x.id === interaction.options.getInteger('numero') && x.status === 'aberta');
      if (!c) return interaction.reply(UI.erro('Não achei uma cobrança aberta com esse número.'));
      c.status = 'cancelada'; N.salvarCobrancas(l);
      return interaction.reply(UI.ok(`Cobrança #${c.id} cancelada.`));
    }

    if (sub === 'canal') {
      const c = interaction.options.getChannel('canal');
      N.setCfg('sonhos_canal', c ? c.id : null);
      return interaction.reply(UI.ok(c ? `Só olho pagamentos em ${c}.` : 'Olho pagamentos em qualquer canal.'));
    }

    if (sub === 'loritta') {
      const id = interaction.options.getString('id').trim();
      if (!/^\d{15,20}$/.test(id)) return interaction.reply(UI.erro('O ID precisa ter só números.'));
      N.setCfg('loritta', id);
      return interaction.reply(UI.ok(`Agora considero as mensagens do bot <@${id}> como sendo da Loritta.`));
    }

    if (sub === 'amostras') {
      const a = N.amostrasSonhos().slice().reverse();
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Caixa', 'Amostras'], titulo: 'Mensagens da Loritta que citaram o pai', descricao: a.map((x, i) => `**${i + 1}.** ${quando(x.em)}\n\`\`\`${x.txt.replace(/`/g, "'").slice(0, 350)}\`\`\``).join('\n').slice(0, 3800) || `Nada ainda. Só guardo mensagens do bot <@${N.lorittaId()}> que citam o pai.` })], flags: UI.EPH, allowedMentions: SEM_PING });
    }

    if (sub === 'teste') {
      const pai = await N.paiId(client);
      const r = Sonhos.entenderPagamento(interaction.options.getString('texto'), { paiId: pai, euId: client.user.id });
      return interaction.reply({ ...(r ? UI.ok(`Entendi como pagamento: **${fmt(r.valor)} sonhos** de <@${r.pagador}> para <@${r.recebedor}>.`) : UI.aviso('Não reconheci como pagamento. O texto precisa ter o valor em "sonhos", um verbo como "enviou/transferiu" e a menção do pai (<@id>) e de quem pagou.')), allowedMentions: SEM_PING });
    }
  },
};
