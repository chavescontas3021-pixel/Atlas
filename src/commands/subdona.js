const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../subdona/nucleo');
const Telas = require('../subdona/telas');
const UI = require('../ui/componentes');
const { S, quando } = require('../ui/tema');

const SEM_PING = { parse: [] };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subdona')
    .setDescription('A Atlas como sub dona: ausência, poderes, delegados e diário')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('Mostra como a sub dona está configurada'))
    .addSubcommand((s) => s.setName('ausente').setDescription('Avisa que você saiu e deixa a sub dona no comando (só o pai)')
      .addStringOption((o) => o.setName('motivo').setDescription('Por que está ausente (aparece para quem te marcar)').setMaxLength(200))
      .addIntegerOption((o) => o.setName('horas').setDescription('Volta em quantas horas? (vazio = até você voltar)').setMinValue(1).setMaxValue(720)))
    .addSubcommand((s) => s.setName('voltar').setDescription('Você voltou: mostra o que aconteceu e tira o modo ausência (só o pai)'))
    .addSubcommand((s) => s.setName('poder').setDescription('Define o que a sub dona pode fazer (só o pai)')
      .addStringOption((o) => o.setName('poder').setDescription('Qual poder').setRequired(true)
        .addChoices(...Object.entries(N.PODERES).map(([valor, p]) => ({ name: p.nome, value: valor }))))
      .addStringOption((o) => o.setName('modo').setDescription('Como ela usa esse poder').setRequired(true)
        .addChoices({ name: 'Automático (faz direto)', value: 'auto' }, { name: 'Pede confirmação (um clique)', value: 'confirma' }, { name: 'Desligado', value: 'off' })))
    .addSubcommand((s) => s.setName('delegar').setDescription('Deixa alguém mandar na sub dona (só o pai)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem passa a poder mandar').setRequired(true)))
    .addSubcommand((s) => s.setName('tirar').setDescription('Tira um delegado (só o pai)')
      .addUserOption((o) => o.setName('membro').setDescription('Quem deixa de mandar').setRequired(true)))
    .addSubcommand((s) => s.setName('diario').setDescription('Tudo que a sub dona fez, com botão de desfazer'))
    .addSubcommand((s) => s.setName('recados').setDescription('Quem te procurou enquanto você esteve ausente')
      .addBooleanOption((o) => o.setName('limpar').setDescription('Apagar todos os recados? (só o pai)'))),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    const sub = interaction.options.getSubcommand();
    const pai = await N.ehPai(client, interaction.user.id);
    const dono = interaction.user.id === (await require('../conversa/nucleo').donoId(client));
    const mandaTudo = pai || dono;
    const podeVer = mandaTudo || N.ehDelegado(interaction.user.id);

    const soPai = () => interaction.reply(UI.erro('Isso é só do pai.'));

    if (sub === 'status') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      return interaction.reply({ ...(await Telas.telaStatus(client)), flags: UI.EPH });
    }

    if (sub === 'ausente') {
      if (!mandaTudo) return soPai();
      const motivo = interaction.options.getString('motivo') || '';
      const horas = interaction.options.getInteger('horas');
      N.ausentar({ motivo, horas });
      return interaction.reply(UI.ok(`Combinado. Estou no comando${horas ? ` por ${horas} h` : ' até você voltar'}. Quem te marcar recebe resposta e eu anoto o recado. Use \`/subdona voltar\` quando voltar.`));
    }

    if (sub === 'voltar') {
      if (!mandaTudo) return soPai();
      const aus = N.ausencia();
      const desde = aus ? aus.desde : 0;
      const feitos = N.diario().filter((d) => d.em >= desde && d.ausencia);
      const rec = N.recados().length;
      N.voltar();
      return interaction.reply({
        embeds: [UI.painel({
          trilha: ['Sub dona'],
          titulo: 'Bem-vindo de volta',
          descricao: aus ? `Você ficou fora desde ${quando(aus.desde)}.` : 'Você não estava marcado como ausente.',
          campos: [
            { nome: 'Ações que fiz', valor: String(feitos.length), lado: true },
            { nome: 'Recados', valor: String(rec), lado: true },
          ],
        })],
        components: [UI.botoes([{ id: 'sd:diarioa:0', label: 'Ver o que fiz' }, { id: 'sd:recados:0', label: 'Ver recados' }])],
        flags: UI.EPH,
      });
    }

    if (sub === 'poder') {
      if (!mandaTudo) return soPai();
      const poder = interaction.options.getString('poder');
      const modo = interaction.options.getString('modo');
      N.setModo(poder, modo);
      return interaction.reply(UI.ok(`**${N.PODERES[poder].nome}**: ${N.MODOS[modo]}.`));
    }

    if (sub === 'delegar' || sub === 'tirar') {
      if (!mandaTudo) return soPai();
      const m = interaction.options.getUser('membro');
      if (m.bot) return interaction.reply(UI.erro('O delegado precisa ser uma pessoa.'));
      if (sub === 'delegar') N.delegar(m.id); else N.tirarDelegado(m.id);
      return interaction.reply({ ...UI.ok(sub === 'delegar' ? `${m} agora pode mandar na sub dona (dentro das permissões que ele já tem no Discord).` : `${m} não manda mais na sub dona.`), allowedMentions: SEM_PING });
    }

    if (sub === 'diario') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      return interaction.reply({ ...Telas.telaDiario(0), flags: UI.EPH });
    }

    if (sub === 'recados') {
      if (!podeVer) return interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
      if (interaction.options.getBoolean('limpar')) {
        if (!mandaTudo) return soPai();
        N.limparRecados();
        return interaction.reply(UI.ok('Recados apagados.'));
      }
      return interaction.reply({ ...Telas.telaRecados(0), flags: UI.EPH });
    }
  },
};
