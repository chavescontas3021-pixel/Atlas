const { AttachmentBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../subdona/nucleo');
const Resumo = require('../subdona/resumo');
const Conselho = require('../subdona/conselho');
const Backup = require('../subdona/backup');
const UI = require('../ui/componentes');

const DIA = 24 * 3600 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gestao')
    .setDescription('Sub dona: resumos, conselhos e backup (só o pai)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('resumo').setDescription('Resumo do que aconteceu')
      .addStringOption((o) => o.setName('periodo').setDescription('Quanto tempo olhar (padrão: 1 dia)')
        .addChoices({ name: 'Último dia', value: '1' }, { name: 'Última semana', value: '7' }, { name: 'Último mês', value: '30' })))
    .addSubcommand((s) => s.setName('conselho').setDescription('Analisa o servidor e sugere ajustes'))
    .addSubcommand((s) => s.setName('automatico').setDescription('Liga ou desliga resumos e backup automáticos')
      .addBooleanOption((o) => o.setName('diario').setDescription('Resumo todo dia'))
      .addBooleanOption((o) => o.setName('semanal').setDescription('Resumo toda segunda-feira'))
      .addIntegerOption((o) => o.setName('hora').setDescription('Hora de Brasília para enviar (0 a 23, padrão 9)').setMinValue(0).setMaxValue(23))
      .addBooleanOption((o) => o.setName('backup').setDescription('Backup semanal da configuração')))
    .addSubcommand((s) => s.setName('backup').setDescription('Baixa um arquivo com toda a configuração da sub dona'))
    .addSubcommand((s) => s.setName('restaurar').setDescription('Restaura a configuração de um arquivo de backup')
      .addAttachmentOption((o) => o.setName('arquivo').setDescription('O arquivo .json do backup'))
      .addIntegerOption((o) => o.setName('copia').setDescription('Ou uma cópia interna (1 = a mais recente)').setMinValue(1).setMaxValue(3))),

  async execute(interaction, client) {
    if (!interaction.inGuild()) return;
    client = client || interaction.client;
    if (!(await N.ehPai(client, interaction.user.id))) return interaction.reply(UI.erro('Isso é só do pai.'));
    const sub = interaction.options.getSubcommand();

    if (sub === 'resumo') {
      const dias = Number(interaction.options.getString('periodo') || 1);
      const titulo = dias === 1 ? 'Resumo do último dia' : dias === 7 ? 'Resumo da semana' : 'Resumo do mês';
      return interaction.reply({ ...Resumo.montar({ desde: Date.now() - dias * DIA, titulo }), flags: UI.EPH });
    }
    if (sub === 'conselho') return interaction.reply({ ...Conselho.tela(interaction.guild), flags: UI.EPH });

    if (sub === 'automatico') {
      const c = Resumo.conf();
      const d = interaction.options.getBoolean('diario');
      const s = interaction.options.getBoolean('semanal');
      const h = interaction.options.getInteger('hora');
      const b = interaction.options.getBoolean('backup');
      if (d !== null) c.diario = d;
      if (s !== null) c.semanal = s;
      if (h !== null) c.hora = h;
      if (b !== null) N.setCfg('backup_auto', b);
      Resumo.setConf(c);
      const onde = N.alertasCanal() ? `<#${N.alertasCanal()}>` : 'sua DM';
      return interaction.reply(UI.ok(`Resumo diário: **${c.diario ? 'ligado' : 'desligado'}**  ·  semanal: **${c.semanal ? 'ligado' : 'desligado'}**  ·  às **${c.hora}h**  ·  backup semanal: **${N.cfg('backup_auto', false) ? 'ligado' : 'desligado'}**\nEnvio em ${onde}.`));
    }

    if (sub === 'backup') {
      const b = Backup.exportar();
      const arq = new AttachmentBuilder(Buffer.from(JSON.stringify(b, null, 2)), { name: `atlas-backup-${new Date().toISOString().slice(0, 10)}.json` });
      return interaction.reply({ ...UI.nota('Backup pronto. Guarde o arquivo: ele traz poderes, delegados, rotinas e a conversa. Não tem token nem senha.', 'ok'), files: [arq], flags: UI.EPH });
    }

    if (sub === 'restaurar') {
      await interaction.deferReply({ flags: UI.EPH });
      const anexo = interaction.options.getAttachment('arquivo');
      const copia = interaction.options.getInteger('copia');
      let backup;
      if (anexo) {
        if (anexo.size > 300 * 1024) return interaction.editReply(UI.erro('Arquivo grande demais.'));
        const texto = await fetch(anexo.url).then((r) => r.text()).catch(() => null);
        if (!texto) return interaction.editReply(UI.erro('Não consegui baixar o arquivo.'));
        const v = Backup.validar(texto);
        if (v.erro) return interaction.editReply(UI.erro(v.erro));
        backup = v.backup;
      } else if (copia) {
        backup = Backup.guardados().slice().reverse()[copia - 1];
        if (!backup) return interaction.editReply(UI.erro('Não há essa cópia interna ainda.'));
      } else {
        return interaction.editReply(UI.erro('Anexe um arquivo ou escolha uma cópia interna.'));
      }
      const token = N.guardarPendente({ tipo: 'backup', backup, uid: interaction.user.id });
      return interaction.editReply({
        embeds: [UI.painel({ trilha: ['Sub dona', 'Backup'], titulo: 'Restaurar esta configuração?', descricao: `${Backup.resumoDe(backup)}\n\nA configuração atual será trocada. Antes disso eu guardo uma cópia dela, então dá para voltar atrás.`, perigo: true })],
        components: [UI.botoes([{ id: `sdg:ok:${token}`, label: 'Restaurar', estilo: 'perigo' }, { id: `sdg:no:${token}`, label: 'Cancelar' }])],
      });
    }
  },
};
