const N = require('../subdona/nucleo');
const Backup = require('../subdona/backup');
const UI = require('../ui/componentes');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      if (!interaction.isButton() || !interaction.customId.startsWith('sdg:')) return;
      if (!(await N.podeMandar(client, interaction.user.id))) return await interaction.reply(UI.erro('Só o responsável e os delegados fazem isso.'));
      const [, acao, token] = interaction.customId.split(':');
      const p = N.pegarPendente(token);
      if (!p || p.tipo !== 'backup' || p.uid !== interaction.user.id) return await interaction.update({ ...UI.edicao(UI.aviso('Esse pedido expirou. Rode `/gestao restaurar` de novo.')), components: [] });
      N.soltarPendente(token);
      if (acao !== 'ok') return await interaction.update({ ...UI.edicao(UI.aviso('Restauração cancelada.')), components: [] });
      const n = Backup.restaurar(p.backup);
      return await interaction.update({ ...UI.edicao(UI.ok(`Configuração restaurada (${n} bloco(s)). Guardei a anterior como cópia interna 1.`)), components: [] });
    } catch (erro) {
      console.error('[Sub dona] gestão:', erro);
      if (!interaction.replied && !interaction.deferred) interaction.reply(UI.erro('Não consegui fazer isso agora.')).catch(() => {});
    }
  },
};
