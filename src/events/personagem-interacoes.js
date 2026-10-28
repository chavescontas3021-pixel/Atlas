const { EmbedBuilder, MessageFlags } = require('discord.js');
const P = require('../personagem/nucleo');
const A = require('../personagem/arte');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    const id = interaction.customId;
    if (!id || !id.startsWith('pers:')) return;
    const [, acao, uid, parte] = id.split(':');
    try {
      if (interaction.user.id !== uid) {
        return await interaction.reply({ content: 'Esse editor é de outra pessoa 💜 Use `/personagem editar` para montar o seu.', flags: EPH });
      }
      const app = P.aparencia(uid);

      if (interaction.isStringSelectMenu()) {
        const v = interaction.values[0];
        if (acao === 'parte') {
          if (!A.CATALOGO[v]) return;
          return await interaction.update(P.painel(uid, v));
        }
        const cat = A.CATALOGO[parte];
        if (!cat) return;
        if (acao === 'estilo' && cat.ids && cat.ids.includes(v)) app[parte].estilo = v;
        else if (acao === 'cor' && cat.cores && cat.cores[Number(v)]) {
          if (parte === 'pele' || parte === 'olhos') app[parte] = Number(v);
          else app[parte].cor = Number(v);
        } else return;
        P.salvar(uid, app);
        return await interaction.update(P.painel(uid, parte));
      }

      if (interaction.isButton()) {
        if (acao === 'esp') {
          if (!P.desbloqueios(uid).includes(parte)) return await interaction.reply({ content: 'Esse personagem não está liberado para você.', flags: EPH });
          app.especial = app.especial === parte ? '' : parte;
          P.salvar(uid, app);
          return await interaction.update(P.painel(uid, 'cabelo', app.especial ? `${P.ESPECIAIS[parte].emoji} Personagem único ligado!` : 'Voltou ao visual montado.'));
        }
        if (acao === 'rand') {
          P.salvar(uid, { ...A.aleatoria(), especial: app.especial });
          return await interaction.update(P.painel(uid, parte && A.CATALOGO[parte] ? parte : 'cabelo', '🎲 Visual sorteado! Ajuste o que quiser.'));
        }
        if (acao === 'reset') {
          P.salvar(uid, { ...A.PADRAO, especial: '' });
          return await interaction.update(P.painel(uid, parte && A.CATALOGO[parte] ? parte : 'cabelo', '↩️ Voltou ao visual padrão.'));
        }
        if (acao === 'fim') {
          const embed = new EmbedBuilder().setColor(P.COR).setTitle('✅ Personagem salvo!')
            .setDescription('Ele já aparece no seu `/rpg perfil` e em `/personagem ver`.\nPara mudar de novo, use `/personagem editar`.')
            .setImage(`attachment://${P.ARQUIVO}`);
          return await interaction.update({ content: '', embeds: [embed], components: [], files: [P.anexo(P.visual(uid))], attachments: [] });
        }
      }
    } catch (erro) {
      console.error('[Personagem] erro na interação:', erro);
      const msg = { content: 'Ops, deu erro no editor. Tente `/personagem editar` de novo.', flags: EPH };
      if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
      else await interaction.reply(msg).catch(() => {});
    }
  },
};
// fim do arquivo
