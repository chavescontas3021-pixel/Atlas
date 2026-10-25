const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const N = require('../aniversario/nucleo');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const meses = N.MESES.map((nome, i) => ({ name: nome, value: i + 1 }));

function podeMexerEm(interaction, alvo) {
  if (alvo.id === interaction.user.id) return true;
  return interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aniversario')
    .setDescription('Aniversários da house')
    .addSubcommand((s) => s.setName('definir').setDescription('Cadastra o seu aniversário')
      .addIntegerOption((o) => o.setName('dia').setDescription('Dia').setRequired(true).setMinValue(1).setMaxValue(31))
      .addIntegerOption((o) => o.setName('mes').setDescription('Mês').setRequired(true).addChoices(...meses))
      .addUserOption((o) => o.setName('membro').setDescription('Outro membro (só staff)')))
    .addSubcommand((s) => s.setName('remover').setDescription('Apaga um aniversário cadastrado')
      .addUserOption((o) => o.setName('membro').setDescription('Outro membro (só staff)')))
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o aniversário de alguém')
      .addUserOption((o) => o.setName('membro').setDescription('Membro (padrão: você)')))
    .addSubcommand((s) => s.setName('proximos').setDescription('Próximos aniversários da house')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const alvo = interaction.options.getUser('membro') || interaction.user;

    if (sub === 'definir') {
      const dia = interaction.options.getInteger('dia');
      const mes = interaction.options.getInteger('mes');
      if (!podeMexerEm(interaction, alvo)) {
        return interaction.reply({ content: '❌ Só a staff pode cadastrar o aniversário de outra pessoa.', flags: EPH });
      }
      if (!N.dataValida(dia, mes)) {
        return interaction.reply({ content: `❌ Essa data não existe (${dia}/${mes}).`, flags: EPH });
      }
      N.definirData(alvo.id, dia, mes);
      const d = { dia, mes };
      const quando = N.diasAte(d, N.hojeBRT());
      return interaction.reply({
        content: `🎂 Aniversário de <@${alvo.id}> salvo: **${N.fmtData(d)}** (${N.MESES[mes - 1]}). ${quando === 0 ? 'É hoje! 🎉' : `Faltam ${quando} dia(s).`}`,
        flags: EPH,
        allowedMentions: { parse: [] },
      });
    }

    if (sub === 'remover') {
      if (!podeMexerEm(interaction, alvo)) {
        return interaction.reply({ content: '❌ Só a staff pode apagar o aniversário de outra pessoa.', flags: EPH });
      }
      if (!N.obterData(alvo.id)) return interaction.reply({ content: 'Não há aniversário cadastrado.', flags: EPH });
      N.removerData(alvo.id);
      return interaction.reply({ content: '🗑️ Aniversário apagado.', flags: EPH });
    }

    if (sub === 'ver') {
      const d = N.obterData(alvo.id);
      if (!d) {
        return interaction.reply({
          content: alvo.id === interaction.user.id ? 'Você ainda não cadastrou. Use `/aniversario definir`.' : 'Essa pessoa ainda não cadastrou.',
          flags: EPH,
        });
      }
      const dias = N.diasAte(d, N.hojeBRT());
      return interaction.reply({
        content: `🎂 Aniversário de <@${alvo.id}>: **${N.fmtData(d)}** — ${dias === 0 ? 'é hoje! 🎉' : `faltam ${dias} dia(s).`}`,
        allowedMentions: { parse: [] },
      });
    }

    if (sub === 'proximos') {
      const lista = N.proximos(10, N.hojeBRT());
      if (!lista.length) return interaction.reply({ content: 'Ninguém cadastrou aniversário ainda.', flags: EPH });
      const txt = lista.map((x) => `🎂 **${N.fmtData(x.d)}** — <@${x.id}> · ${x.dias === 0 ? '**hoje!**' : x.dias === 1 ? 'amanhã' : `em ${x.dias} dias`}`).join('\n');
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COR).setTitle('🎉 Próximos aniversários').setDescription(txt)],
        allowedMentions: { parse: [] },
      });
    }
  },
};
