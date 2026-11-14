const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../conversa/nucleo');
const Dic = require('../conversa/dicionario');
const UI = require('../ui/componentes');
const { S, corta } = require('../ui/tema');

const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('conversa')
    .setDescription('Configura a conversa do Atlas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra como a conversa está configurada'))
    .addSubcommand((s) => s.setName('canal').setDescription('Define o único canal onde o Atlas conversa')
      .addChannelOption((o) => o.setName('canal').setDescription('Canal de texto').setRequired(true)
        .addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('ligar').setDescription('Liga ou desliga a conversa')
      .addBooleanOption((o) => o.setName('ativo').setDescription('Ligado?').setRequired(true)))
    .addSubcommand((s) => s.setName('espera').setDescription('Tempo de espera entre falas de cada pessoa')
      .addIntegerOption((o) => o.setName('segundos').setDescription('De 5 a 300').setRequired(true).setMinValue(5).setMaxValue(300)))
    .addSubcommand((s) => s.setName('pai').setDescription('Define quem é o "pai" do Atlas (só o dono do bot)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem será tratado como pai').setRequired(true)))
    .addSubcommand((s) => s.setName('tom').setDescription('Muda a personalidade do Atlas na conversa')
      .addStringOption((o) => o.setName('qual').setDescription('Personalidade').setRequired(true)
        .addChoices({ name: 'Vanellope (debochada e cheia de energia)', value: 'vanellope' }, { name: 'Atlas (guia calmo e elegante)', value: 'atlas' })))
    .addSubcommand((s) => s.setName('palavrao').setDescription('Liga ou desliga os palavrões nas respostas')
      .addBooleanOption((o) => o.setName('ativo').setDescription('Pode falar palavrão?').setRequired(true)))
    .addSubcommand((s) => s.setName('ia').setDescription('Liga ou desliga a IA gratuita e define o limite diário')
      .addBooleanOption((o) => o.setName('ativo').setDescription('IA ligada?'))
      .addIntegerOption((o) => o.setName('limite').setDescription('Máximo de respostas da IA por dia (10 a 5000)').setMinValue(10).setMaxValue(5000)))
    .addSubcommand((s) => s.setName('alvo').setDescription('Escolhe quem leva o tratamento "dura e chata" (só o pai)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem será o alvo da implicância'))
      .addBooleanOption((o) => o.setName('remover').setDescription('Tirar o alvo atual?')))
    .addSubcommand((s) => s.setName('ensinar').setDescription('Ensina uma resposta nova ao Atlas')
      .addStringOption((o) => o.setName('gatilhos').setDescription('Palavras que ativam, separadas por vírgula (ex.: pix, chave pix)').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('resposta').setDescription('O que ele responde (use | para dar várias opções)').setRequired(true).setMaxLength(1500))
      .addBooleanOption((o) => o.setName('so_pai').setDescription('Responder só para o pai?')))
    .addSubcommand((s) => s.setName('listar').setDescription('Lista as respostas que a staff ensinou'))
    .addSubcommand((s) => s.setName('esquecer').setDescription('Apaga uma resposta ensinada')
      .addIntegerOption((o) => o.setName('numero').setDescription('Número da lista').setRequired(true).setMinValue(1)))
    .addSubcommand((s) => s.setName('testar').setDescription('Vê o que o Atlas responderia a uma frase')
      .addStringOption((o) => o.setName('frase').setDescription('A frase').setRequired(true).setMaxLength(300))
      .addBooleanOption((o) => o.setName('como_pai').setDescription('Testar como se fosse o pai falando?'))
      .addBooleanOption((o) => o.setName('como_alvo').setDescription('Testar como se fosse o alvo da implicância?')))
    .addSubcommand((s) => s.setName('dicionario').setDescription('Testa a consulta ao dicionário')
      .addStringOption((o) => o.setName('palavra').setDescription('Palavra').setRequired(true).setMaxLength(40))),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();
    client = client || interaction.client;

    if (sub === 'status') {
      const canal = N.canal();
      const pai = await N.paiId(client);
      const aprendidas = N.aprendidas().length;
      return interaction.reply({
        embeds: [UI.painel({
          trilha: ['Conversa', 'Configuração'],
          titulo: N.ligado() ? 'A conversa está ligada' : 'A conversa está desligada',
          campos: [
            { nome: 'Canal', valor: canal ? `<#${canal}>` : 'não definido (o Atlas não responde em lugar nenhum)', lado: true },
            { nome: 'Espera', valor: `${N.espera()} s  ${S.sep}  pai: ${N.ESPERA_PAI} s`, lado: true },
            { nome: 'Pai', valor: pai ? `<@${pai}>` : 'não encontrado', lado: true },
            { nome: 'Respostas ensinadas', valor: String(aprendidas), lado: true },
            { nome: 'Personalidade', valor: N.tom() === 'vanellope' ? 'Vanellope' : 'Atlas (guia)', lado: true },
            { nome: 'Palavrões', valor: N.palavrao() ? 'liberados' : 'desligados', lado: true },
            { nome: 'IA gratuita', valor: !N.IA.disponivel() ? 'sem chave no .env (só respostas prontas)' : `${N.IA.ligada() ? 'ligada' : 'desligada'}  ${S.sep}  ${N.IA.modelo()}  ${S.sep}  hoje ${N.IA.usoHoje()}/${N.IA.limite()}`, lado: true },
            { nome: 'Alvo da implicância', valor: N.alvoId() ? `<@${N.alvoId()}>` : 'ninguém', lado: true },
            { nome: 'Como chamar o Atlas', valor: 'Marcar `@Atlas`, responder a uma mensagem dele ou começar a frase com **atlas**' },
            { nome: 'Nunca responde', valor: 'Bots e membros na blacklist' },
          ],
        })],
        flags: UI.EPH,
        allowedMentions: SEM_PING,
      });
    }

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      N.setCfg('canal', canal.id);
      return interaction.reply(UI.ok(`O Atlas vai conversar só em ${canal}.`));
    }

    if (sub === 'ligar') {
      const ativo = interaction.options.getBoolean('ativo');
      N.setCfg('ligado', ativo);
      return interaction.reply(UI.ok(ativo ? 'Conversa ligada.' : 'Conversa desligada.'));
    }

    if (sub === 'espera') {
      const s = interaction.options.getInteger('segundos');
      N.setCfg('espera', s);
      return interaction.reply(UI.ok(`Cada pessoa precisa esperar **${s} s** entre uma fala e outra com o Atlas.`));
    }

    if (sub === 'pai') {
      const dono = await N.donoId(client);
      const atual = N.cfg('pai', null);
      if (interaction.user.id !== dono && interaction.user.id !== atual) {
        return interaction.reply(UI.erro('Só o dono do bot pode escolher o pai do Atlas.'));
      }
      const membro = interaction.options.getUser('membro');
      if (membro.bot) return interaction.reply(UI.erro('O pai precisa ser uma pessoa.'));
      N.setCfg('pai', membro.id);
      return interaction.reply({ ...UI.ok(`${membro} agora é o pai do Atlas.`), allowedMentions: SEM_PING });
    }

    if (sub === 'tom') {
      const qual = interaction.options.getString('qual');
      N.setCfg('tom', qual);
      return interaction.reply(UI.ok(qual === 'vanellope' ? 'Agora o Atlas fala com a personalidade da Vanellope.' : 'Voltei para o jeito calmo de guia.'));
    }

    if (sub === 'palavrao') {
      const ativo = interaction.options.getBoolean('ativo');
      N.setCfg('palavrao', ativo);
      return interaction.reply(UI.ok(ativo ? 'Palavrões liberados (só os que o automod não bloqueia).' : 'Palavrões desligados. Ninguém recebe palavrão do Atlas.'));
    }

    if (sub === 'ia') {
      const ativo = interaction.options.getBoolean('ativo');
      const lim = interaction.options.getInteger('limite');
      if (ativo !== null) N.setCfg('ia', ativo);
      if (lim !== null) N.setCfg('ia_limite', lim);
      if (!N.IA.disponivel()) return interaction.reply(UI.aviso('Configuração salva, mas não há IA_KEY no .env do bot. Sem a chave, o Atlas usa só as respostas prontas.'));
      return interaction.reply(UI.ok(`IA ${N.IA.ligada() ? 'ligada' : 'desligada'}. Limite: ${N.IA.limite()} respostas por dia (hoje: ${N.IA.usoHoje()}).`));
    }

    if (sub === 'alvo') {
      const pai = await N.paiId(client);
      const dono = await N.donoId(client);
      if (interaction.user.id !== pai && interaction.user.id !== dono) {
        return interaction.reply(UI.erro('Só o pai do Atlas escolhe o alvo da implicância.'));
      }
      if (interaction.options.getBoolean('remover')) {
        N.setCfg('alvo', null);
        return interaction.reply(UI.ok('Pronto, o Atlas voltou a tratar todo mundo igual.'));
      }
      const membro = interaction.options.getUser('membro');
      if (!membro) return interaction.reply(UI.erro('Escolha um membro, ou use `remover: true` para tirar o alvo.'));
      if (membro.bot) return interaction.reply(UI.erro('O alvo precisa ser uma pessoa.'));
      if (membro.id === pai) return interaction.reply(UI.erro('O pai não pode ser o alvo.'));
      N.setCfg('alvo', membro.id);
      return interaction.reply({ ...UI.ok(`${membro} agora leva o tratamento "dura e chata" do Atlas. Use só com quem entende a brincadeira.`), allowedMentions: SEM_PING });
    }

    if (sub === 'ensinar') {
      const gatilhos = interaction.options.getString('gatilhos').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
      const respostas = interaction.options.getString('resposta').split('|');
      const r = N.ensinar({
        gatilhos, respostas, soPai: interaction.options.getBoolean('so_pai') || false, por: interaction.user.id,
      });
      if (r.erro) return interaction.reply(UI.erro(r.erro));
      return interaction.reply(UI.ok(`Aprendi. Quando alguém disser ${r.item.gatilhos.map((g) => `**${g}**`).join(', ')}, eu respondo${r.item.soPai ? ' (só para o pai)' : ''}. Respostas ensinadas: ${r.total}.`));
    }

    if (sub === 'listar') {
      const lista = N.aprendidas();
      if (!lista.length) return interaction.reply(UI.ok('Ainda não ensinaram nenhuma resposta. Use `/conversa ensinar`.'));
      const linhas = lista.map((a, i) => `**${i + 1}**  ${S.sep}  ${a.gatilhos.join(', ')}${a.soPai ? `  ${S.lock}` : ''}\n${S.filho} ${corta(a.respostas.join('  |  '), 140)}`);
      return interaction.reply({
        embeds: [UI.painel({ trilha: ['Conversa', 'Ensinadas'], titulo: 'O que o Atlas aprendeu', descricao: linhas.join('\n\n').slice(0, 3800), rodape: `${S.lock} = só para o pai  ${S.sep}  /conversa esquecer <número>` })],
        flags: UI.EPH,
      });
    }

    if (sub === 'esquecer') {
      const tirada = N.esquecer(interaction.options.getInteger('numero'));
      if (!tirada) return interaction.reply(UI.erro('Não existe resposta com esse número.'));
      return interaction.reply(UI.ok(`Esqueci a resposta para **${tirada.gatilhos.join(', ')}**.`));
    }

    if (sub === 'testar') {
      const frase = interaction.options.getString('frase');
      const pai = interaction.options.getBoolean('como_pai') || false;
      const alvo = !pai && (interaction.options.getBoolean('como_alvo') || false);
      await interaction.deferReply({ flags: UI.EPH });
      const r = await N.responder({
        conteudo: frase, uid: interaction.user.id, nome: interaction.member?.displayName || interaction.user.username, pai, alvo, client,
      });
      const embed = UI.painel({
        trilha: ['Conversa', 'Teste'],
        titulo: `Assunto: ${r.assunto}`,
        descricao: r.content || '—',
        rodape: pai ? 'Como se o pai estivesse falando' : alvo ? 'Como se o alvo estivesse falando' : 'Como membro comum',
      });
      return interaction.editReply({ embeds: [embed, ...(r.embeds || [])], allowedMentions: SEM_PING });
    }

    if (sub === 'dicionario') {
      await interaction.deferReply({ flags: UI.EPH });
      const res = await Dic.definir(interaction.options.getString('palavra'));
      if (!res.ok) {
        const msg = res.motivo === 'erro'
          ? 'Nenhuma das 3 fontes respondeu. O bot pode estar sem acesso à internet ou os sites estão fora do ar.'
          : res.motivo === 'invalida' ? 'Palavra inválida. Use só letras.' : `Não encontrei **${res.palavra}**.`;
        return interaction.editReply(UI.edicao(UI.erro(msg)));
      }
      return interaction.editReply({
        embeds: [UI.painel({
          trilha: ['Dicionário'], titulo: res.palavra,
          descricao: res.definicoes.map((d, i) => `**${i + 1}.**  ${d}`).join('\n\n').slice(0, 3800),
          rodape: `Fonte: ${res.fonte}`,
        })],
      });
    }
  },
};
