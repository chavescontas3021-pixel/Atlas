// Botões da sub dona: confirmar, cancelar, desfazer e páginas do diário e dos recados.
const B = require('../blacklist/nucleo');
const N = require('../subdona/nucleo');
const Ordem = require('../subdona/ordem');
const Telas = require('../subdona/telas');
const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('sd:')) return;
      if (B.esta(interaction.user.id)) return await interaction.deferUpdate();
      const [, acao, valor] = interaction.customId.split(':');

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
      if (!interaction.replied && !interaction.deferred) interaction.reply(UI.erro('Não consegui fazer isso agora.')).catch(() => {});
    }
  },
};
