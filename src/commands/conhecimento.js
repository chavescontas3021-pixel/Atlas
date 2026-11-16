const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../subdona/nucleo');
const K = require('../subdona/conhecimento');
const UI = require('../ui/componentes');
const { S, quando, corta } = require('../ui/tema');

const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('conhecimento')
    .setDescription('Ensina a Atlas a responder perguntas dos membros (nos canais de dúvidas e nos tickets)')
    .addSubcommand((s) => s.setName('adicionar').setDescription('Ensina uma pergunta e a resposta')
      .addStringOption((o) => o.setName('pergunta').setDescription('Ex.: Como entro na house?').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('resposta').setDescription('O que eu devo responder').setRequired(true).setMaxLength(1500))
      .addStringOption((o) => o.setName('palavras').setDescription('Palavras que ajudam a achar (ex.: entrar entrada vaga)').setMaxLength(200)))
    .addSubcommand((s) => s.setName('listar').setDescription('Mostra o que eu sei'))
    .addSubcommand((s) => s.setName('remover').setDescription('Esquece uma resposta')
      .addIntegerOption((o) => o.setName('numero').setDescription('Número da resposta').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('pendentes').setDescription('Perguntas que não soube responder')
      .addBooleanOption((o) => o.setName('limpar').setDescription('Apagar a lista de pendentes')))
    .addSubcommand((s) => s.setName('testar').setDescription('Vê o que eu responderia a uma pergunta')
      .addStringOption((o) => o.setName('pergunta').setDescription('A pergunta').setRequired(true).setMaxLength(300)))
    .addSubcommand((s) => s.setName('canais').setDescription('Canais de dúvidas, onde respondo qualquer pergunta')
      .addStringOption((o) => o.setName('acao').setDescription('O que fazer').setRequired(true).addChoices({ name: 'Adicionar canal', value: 'add' }, { name: 'Tirar canal', value: 'tirar' }, { name: 'Ver a lista', value: 'ver' }))
      .addChannelOption((o) => o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
    .addSubcommand((s) => s.setName('modo').setDescription('Quando eu respondo perguntas')
      .addStringOption((o) => o.setName('quando').setDescription('Quando').setRequired(true).addChoices({ name: 'Sempre', value: 'sempre' }, { name: 'Só com o pai ausente', value: 'ausente' }, { name: 'Nunca', value: 'off' }))),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    const staff = interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
    if (!staff && !(await N.podeMandar(client, interaction.user.id))) return interaction.reply(UI.erro('Só a staff, o pai e os delegados mexem nisso.'));
    const sub = interaction.options.getSubcommand();

    if (sub === 'adicionar') {
      const r = K.adicionar({ pergunta: interaction.options.getString('pergunta'), resposta: interaction.options.getString('resposta'), chaves: interaction.options.getString('palavras') || '', por: interaction.user.id });
      if (r.erro) return interaction.reply(UI.erro(r.erro));
      return interaction.reply(UI.ok(`Aprendi (**#${r.item.id}**). Palavras que vou procurar: ${[...new Set([...K.palavras(r.item.pergunta), ...r.item.chaves])].join(', ') || 'nenhuma'}.\nDica: use \`/conhecimento testar\` para ver se uma pergunta parecida acha esta resposta.`));
    }
    if (sub === 'listar') {
      const l = K.lista().slice(-15).reverse();
      const linhas = l.map((x) => `**#${x.id}**  ${S.sep}  ${corta(x.pergunta, 70)}  ${S.sep}  usada ${x.usos || 0}x\n${S.filho} ${corta(x.resposta, 100)}`);
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Conhecimento'], titulo: `${K.lista().length} resposta(s)`, descricao: linhas.join('\n\n') || 'Ainda não sei nada. Ensine com `/conhecimento adicionar`.', rodape: 'Mostrando as 15 mais recentes' })], flags: UI.EPH, allowedMentions: SEM_PING });
    }
    if (sub === 'remover') return interaction.reply(K.remover(interaction.options.getInteger('numero')) ? UI.ok('Esqueci essa resposta.') : UI.erro('Não achei essa resposta.'));
    if (sub === 'pendentes') {
      if (interaction.options.getBoolean('limpar')) { K.limparPendentes(); return interaction.reply(UI.ok('Lista de pendentes apagada.')); }
      const l = K.pendentes().slice().reverse().slice(0, 15);
      const linhas = l.map((x) => `${corta(x.texto, 120)}\n${S.filho} ${x.vezes}x  ${S.sep}  ${quando(x.em)}`);
      return interaction.reply({ embeds: [UI.painel({ trilha: ['Conhecimento', 'Pendentes'], titulo: 'Perguntas que não soube responder', descricao: linhas.join('\n\n') || 'Nenhuma pendente.', rodape: 'Responda com /conhecimento adicionar e a pergunta some daqui' })], flags: UI.EPH, allowedMentions: SEM_PING });
    }
    if (sub === 'testar') {
      const q = interaction.options.getString('pergunta'); const r = K.buscar(q);
      const talvez = K.ranking(q).slice(0, 3).map((x) => `#${x.item.id} (${x.acertos} pt)`).join(', ');
      return interaction.reply({ ...(r ? UI.ok(`Eu responderia (#${r.item.id}):\n${corta(r.item.resposta, 400)}`) : UI.aviso(`Não acharia uma resposta segura.${talvez ? ` Mais próximas: ${talvez}.` : ''} Ensine com \`/conhecimento adicionar\`.`)), allowedMentions: SEM_PING });
    }
    if (sub === 'canais') {
      const acao = interaction.options.getString('acao'); const c = interaction.options.getChannel('canal'); const cfg = N.perguntas();
      if (acao !== 'ver' && !c) return interaction.reply(UI.erro('Escolha o canal.'));
      if (acao === 'add') N.setPerguntas({ canais: [...new Set([...cfg.canais, c.id])].slice(0, 25) });
      if (acao === 'tirar') N.setPerguntas({ canais: cfg.canais.filter((x) => x !== c.id) });
      const l = N.perguntas().canais;
      return interaction.reply({ ...UI.ok(`Canais de dúvidas: ${l.length ? l.map((i) => `<#${i}>`).join(' ') : 'nenhum'}.\nNeles eu respondo toda pergunta que souber. Fora deles, só quando me marcam.`), allowedMentions: SEM_PING });
    }
    if (sub === 'modo') {
      const m = interaction.options.getString('quando'); N.setPerguntas({ modo: m });
      return interaction.reply(UI.ok({ sempre: 'Vou responder perguntas sempre.', ausente: 'Vou responder perguntas só quando o pai estiver ausente.', off: 'Não respondo mais perguntas (os tickets continuam com o atendimento normal).' }[m]));
    }
  },
};
