// Botões da sub dona: confirmar, cancelar, desfazer e páginas do diário e dos recados.
const B = require('../blacklist/nucleo');
const N = require('../subdona/nucleo');
const Ordem = require('../subdona/ordem');
const Telas = require('../subdona/telas');
const UI = require('../ui/componentes');
const Vigia = require('../subdona/vigia');
const Atendente = require('../subdona/atendente');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton()) return;
      if (/^sdt?:/.test(interaction.customId)) require('../subdona/publico').aplicar(interaction);
      const id = interaction.customId;
      if (!id.startsWith('sd:') && !id.startsWith('sdt:')) return;
      if (B.esta(interaction.user.id)) return await interaction.deferUpdate();

      // Botões dentro de tickets
      if (id.startsWith('sdt:')) {
        if (!N.ativo()) return await interaction.reply(UI.aviso('O modo sub dona está desligado.'));
        return await Atendente.aoClicar(interaction, client, id.split(':')[1]);
      }
      const [, acao, valor] = interaction.customId.split(':');

      if (acao === 'panico') {
        if (!(await N.podeMandar(client, interaction.user.id))) return await interaction.reply(UI.erro('Só o pai e os delegados usam isso.'));
        if (valor === 'no') return await interaction.update({ ...UI.edicao(UI.aviso('Ignorado.')), components: [] });
        await interaction.deferUpdate();
        const r = await Vigia.panico(interaction.guild, valor === 'on');
        return await interaction.editReply({ ...UI.edicao(UI.ok(valor === 'on' ? `Servidor trancado: ${r.trancados} canais.` : `Servidor destrancado: ${r.abertos} canais.`, { publica: true })), components: [] });
      }
      if (acao === 'ok' || acao === 'no') return await Ordem.aoClicarConfirmacao(interaction, client, acao === 'ok', valor);
      if (acao === 'undo') return await Ordem.aoDesfazer(interaction, client, Number(valor));

      if (acao === 'diario' || acao === 'diarioa' || acao === 'recados') {
        if (!(await N.podeMandar(client, interaction.user.id))) return await interaction.reply(UI.erro('Só o pai e os delegados veem isso.'));
        const pag = Number(valor) || 0;
        const tela = acao === 'recados' ? Telas.telaRecados(pag) : Telas.telaDiario(pag, acao === 'diarioa');
        return await interaction.update(UI.edicao(tela));
      }
    } catch (erro) {
      console.error('[Sub dona] botão:', erro);
      if (!interaction.replied && !interaction.deferred) interaction.reply(UI.erro(`Não consegui fazer isso agora. (${String(erro && erro.message || erro).slice(0, 120)})`)).catch(() => {});
    }
  },
};
