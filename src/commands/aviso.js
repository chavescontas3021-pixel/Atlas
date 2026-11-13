const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../moderacao/nucleo');
const UI = require('../ui/componentes');
const { S, barra, corta, quando } = require('../ui/tema');

const SEM_PING = { parse: [] };

// Painel com a lista de avisos + menu para remover um deles
function telaAvisos(user, lista) {
  const linhas = lista.map((a, i) => {
    let l = `**${i + 1}**  ${S.sep}  ${quando(a.data, 'd')}  ${S.sep}  por <@${a.por}>\n${S.filho} ${a.motivo}`;
    if (a.regra) l += `\n${S.filho} regra ${a.regra}`;
    return l;
  });
  const embed = UI.painel({
    trilha: ['Moderação', 'Avisos'],
    titulo: user.username,
    descricao: linhas.length ? linhas.join('\n\n').slice(0, 3800) : 'Nenhum aviso.',
    rodape: `${lista.length}/${N.limite()}  ${barra(lista.length / N.limite(), N.limite())}`,
  });
  const componentes = lista.length
    ? [UI.menu({
      id: `aviso:rem:${user.id}`,
      placeholder: 'Remover um aviso',
      opcoes: lista.slice(0, 25).map((a, i) => ({
        valor: String(i), nome: `Aviso ${i + 1}`, desc: corta(a.motivo, 90),
      })),
    })]
    : [];
  return { embeds: [embed], components: componentes, allowedMentions: SEM_PING };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aviso')
    .setDescription('Avisos de membros (3 avisos = banimento)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s
        .setName('dar')
        .setDescription('Dá um aviso a um membro')
        .addUserOption((o) => o.setName('membro').setDescription('Quem vai receber').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo do aviso').setRequired(true).setMaxLength(300))
        .addIntegerOption((o) => o.setName('regra').setDescription('Regra quebrada (opcional)').setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('listar')
        .setDescription('Lista os avisos de um membro (e permite remover pelo menu)')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Remove um aviso pelo número (veja em listar)')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
        .addIntegerOption((o) => o.setName('numero').setDescription('Número do aviso').setRequired(true).setMinValue(1))
    )
    .addSubcommand((s) =>
      s
        .setName('limpar')
        .setDescription('Remove todos os avisos de um membro')
        .addUserOption((o) => o.setName('membro').setDescription('O membro').setRequired(true))
    ),

  telaAvisos,

  async execute(interaction) {
    if (!interaction.inGuild()) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'dar') {
      const membro = interaction.options.getMember('membro');
      if (!membro) return interaction.reply(UI.erro('Esse membro não está no servidor.'));
      if (membro.user.bot) return interaction.reply(UI.erro('Não dá para avisar bots.'));

      const erro = N.checarHierarquia(interaction.member, membro);
      if (erro) return interaction.reply(UI.erro(erro));

      const motivo = interaction.options.getString('motivo');
      const regra = interaction.options.getInteger('regra');
      if (regra && regra > N.regras().length) {
        return interaction.reply(UI.erro('Essa regra não existe. Veja com `/regras listar`.'));
      }

      await interaction.deferReply({ flags: UI.EPH });
      // No canal de divergências a advertência sai no próprio canal (sem DM) e ganha um tópico
      const idCanal = N.canalAdvertencia();
      const noCanalCerto = !!idCanal && interaction.channelId === idCanal;
      const r = await N.darAviso(interaction.guild, interaction.user, membro, motivo, regra, {
        canal: noCanalCerto ? interaction.channel : null,
      });

      const campos = [
        { nome: 'Avisos', valor: `${barra(r.total / r.limite, r.limite)}  ${r.total}/${r.limite}`, lado: true },
        { nome: 'Motivo', valor: motivo },
      ];
      let envio;
      if (noCanalCerto && r.noCanal && r.noCanal.msg) {
        envio = 'Registrada no canal';
        if (r.noCanal.topico) envio += `  ${S.sep}  tópico ${r.noCanal.topico}`;
        else if (r.noCanal.erroTopico) envio += `\n${S.vazio}  Não consegui criar o tópico: ${r.noCanal.erroTopico}.`;
      } else if (noCanalCerto) {
        envio = `Não consegui postar no canal (${r.noCanal ? r.noCanal.erro : 'erro'})  ${S.sep}  DM ${r.dm ? 'enviada' : 'não enviada'}`;
      } else {
        envio = `DM ${S.sep} ${r.dm ? 'enviada' : 'não foi possível enviar (DM fechada)'}`;
      }
      campos.push({ nome: 'Envio', valor: envio });
      if (r.banido) {
        campos.push({
          nome: 'Limite atingido',
          valor: r.banido.ok ? 'O membro foi **banido automaticamente**.' : `Não consegui banir: ${r.banido.erro}.`,
        });
      }
      const embed = UI.painel({
        trilha: ['Moderação', 'Aviso'],
        titulo: `Aviso dado a ${membro.user.username}`,
        campos,
        perigo: !!(r.banido && r.banido.ok),
      });
      return interaction.editReply({ embeds: [embed], allowedMentions: SEM_PING });
    }

    const user = interaction.options.getUser('membro');
    let lista = N.avisosDe(user.id);

    if (sub === 'listar') {
      if (!lista.length) return interaction.reply(UI.ok(`${user} não tem avisos.`));
      await interaction.reply({ ...telaAvisos(user, lista), flags: UI.EPH });
      const msg = await interaction.fetchReply();
      const base = `aviso:rem:${user.id}`;
      const coletor = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id && i.customId === base,
        time: 120000,
      });
      coletor.on('collect', async (i) => {
        lista = N.avisosDe(user.id);
        const removido = lista.splice(parseInt(i.values[0], 10), 1)[0];
        if (removido) {
          N.salvarAvisos(user.id, lista);
          await N.registrar(interaction.guild, {
            titulo: 'Aviso removido',
            cor: N.COR.ok,
            alvo: user,
            executor: interaction.user,
            motivo: `Aviso removido: ${removido.motivo}`,
            extras: [{ name: 'Avisos agora', value: `${lista.length}/${N.limite()}`, inline: true }],
          });
        }
        await i.update(UI.edicao(telaAvisos(user, lista)));
      });
      coletor.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => {});
      });
      return;
    }

    if (sub === 'remover') {
      const n = interaction.options.getInteger('numero');
      if (!lista[n - 1]) return interaction.reply(UI.erro('Não existe aviso com esse número.'));
      const [removido] = lista.splice(n - 1, 1);
      N.salvarAvisos(user.id, lista);
      await N.registrar(interaction.guild, {
        titulo: 'Aviso removido',
        cor: N.COR.ok,
        alvo: user,
        executor: interaction.user,
        motivo: `Aviso removido: ${removido.motivo}`,
        extras: [{ name: 'Avisos agora', value: `${lista.length}/${N.limite()}`, inline: true }],
      });
      return interaction.reply({ ...UI.ok(`Aviso removido. ${user} agora tem **${lista.length}/${N.limite()}**.`), allowedMentions: SEM_PING });
    }

    if (sub === 'limpar') {
      if (!lista.length) return interaction.reply(UI.ok(`${user} não tem avisos.`));
      N.salvarAvisos(user.id, []);
      await N.registrar(interaction.guild, {
        titulo: 'Avisos limpos',
        cor: N.COR.ok,
        alvo: user,
        executor: interaction.user,
        motivo: `Todos os avisos (${lista.length}) foram removidos.`,
      });
      return interaction.reply({ ...UI.ok(`Todos os avisos de ${user} foram removidos.`), allowedMentions: SEM_PING });
    }
  },
};
