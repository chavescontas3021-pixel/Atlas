const { MessageFlags } = require('discord.js');
const { ITENS, LOJA } = require('../rpg/dados');
const N = require('../rpg/nucleo');
const C = require('../rpg/combate');
const { EmbedBuilder } = require('discord.js');

const EPH = MessageFlags.Ephemeral;

async function autocompletar(interaction) {
  const foco = interaction.options.getFocused().toLowerCase();
  let ids = [];

  if (interaction.commandName === 'rpgadmin') {
    ids = Object.keys(ITENS);
  } else {
    const sub = interaction.options.getSubcommand();
    const j = N.obter(interaction.user.id);
    const inv = j ? Object.keys(j.inv) : [];
    if (sub === 'comprar') ids = LOJA;
    else if (sub === 'vender') ids = inv;
    else if (sub === 'usar') ids = inv.filter((k) => ITENS[k] && ITENS[k].tipo === 'consumo');
    else if (sub === 'equipar') ids = inv.filter((k) => ITENS[k] && ['arma', 'armadura'].includes(ITENS[k].tipo));
  }

  const res = ids
    .filter((k) => ITENS[k] && ITENS[k].nome.toLowerCase().includes(foco))
    .slice(0, 25)
    .map((k) => ({ name: `${ITENS[k].emoji} ${ITENS[k].nome}`.slice(0, 100), value: k }));
  await interaction.respond(res).catch(() => {});
}

async function combate(interaction, partes) {
  const acao = partes[2];
  const userId = partes[3];
  if (interaction.user.id !== userId) {
    return interaction.reply({ content: 'Esse combate não é seu.', flags: EPH });
  }
  const e = C.obterAtivo(userId);
  if (!e) {
    return interaction.update({ content: '⌛ Esse combate expirou.', components: [] });
  }
  const j = N.obter(userId);
  if (!j) return interaction.update({ content: 'Personagem não encontrado.', components: [] });

  const r = C.agir(e, j, acao);
  if (r.invalido) return interaction.reply({ content: r.invalido, flags: EPH });

  if (r.fim) {
    const res = C.finalizar(e, j, r.fim);
    return interaction.update({ embeds: [C.embedFim(e, j, r.fim, res)], components: [] });
  }
  N.salvar(userId, j);
  return interaction.update({ embeds: [C.embedCombate(e, j)], components: C.botoes(userId) });
}

async function duelo(interaction, partes) {
  const [, , acao, desafianteId, alvoId, apostaTxt] = partes;
  const aposta = parseInt(apostaTxt, 10) || 0;
  if (interaction.user.id !== alvoId) {
    return interaction.reply({ content: 'Só o desafiado pode responder.', flags: EPH });
  }
  if (acao === 'no') {
    return interaction.update({ content: `❌ <@${alvoId}> recusou o duelo.`, components: [] });
  }

  const a = N.obter(desafianteId);
  const b = N.obter(alvoId);
  if (!a || !b) return interaction.update({ content: 'Um dos personagens não existe mais.', components: [] });
  if (a.moedas < aposta || b.moedas < aposta) {
    return interaction.update({ content: 'Alguém não tem mais moedas para a aposta. Duelo cancelado.', components: [] });
  }

  const r = C.simularDuelo(a, b);
  const venceu = r.vencedor === 'a' ? desafianteId : alvoId;
  const perdeu = r.vencedor === 'a' ? alvoId : desafianteId;
  const jv = r.vencedor === 'a' ? a : b;
  const jp = r.vencedor === 'a' ? b : a;

  jv.moedas += aposta;
  jp.moedas -= aposta;
  jv.vitorias++;
  jp.derrotas++;
  const subiu = N.ganharXp(jv, 20);
  N.salvar(venceu, jv);
  N.salvar(perdeu, jp);

  const emb = new EmbedBuilder()
    .setColor(N.COR)
    .setTitle('⚔️ Resultado do duelo')
    .setDescription(
      `🏆 Vencedor: <@${venceu}>\n💀 Perdedor: <@${perdeu}>\n🔁 Rodadas: ${r.rounds}\n` +
      `❤️ Vida final: <@${desafianteId}> ${r.hpA}/${a.hpMax} · <@${alvoId}> ${r.hpB}/${b.hpMax}\n` +
      `${aposta ? `💰 Aposta: ${aposta} moedas\n` : ''}⭐ Vencedor ganhou +20 XP${subiu ? ` e subiu para o nível ${jv.nivel}!` : '.'}`,
    );
  return interaction.update({ content: '', embeds: [emb], components: [] });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && ['rpg', 'rpgadmin'].includes(interaction.commandName)) {
        return await autocompletar(interaction);
      }
      if (interaction.isButton() && interaction.customId.startsWith('rpg:')) {
        const partes = interaction.customId.split(':');
        if (partes[1] === 'c') return await combate(interaction, partes);
        if (partes[1] === 'd') return await duelo(interaction, partes);
      }
    } catch (err) {
      console.error('[RPG]', err);
      try {
        if (interaction.isRepliable && interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Deu erro no RPG. Tente de novo.', flags: EPH });
        }
      } catch (_) { /* ignora */ }
    }
  },
};
