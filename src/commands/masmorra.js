const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../db');
const N = require('../rpg/nucleo');
const D = require('../rpg/masmorra-dados');
const M = require('../rpg/masmorra');
const C = require('../rpg/combate');

const EPH = MessageFlags.Ephemeral;
const escolhas = D.ORDEM.map((k) => ({ name: `${D.MASMORRAS[k].emoji} ${D.MASMORRAS[k].dificuldade} · ${D.MASMORRAS[k].andares} andares`, value: k }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('masmorra')
    .setDescription('Masmorras: andares com 5 bichos e um Boss no fim')
    .addSubcommand((s) => s.setName('entrar').setDescription('Entra numa masmorra')
      .addStringOption((o) => o.setName('dificuldade').setDescription('Qual masmorra').setRequired(true).addChoices(...escolhas)))
    .addSubcommand((s) => s.setName('continuar').setDescription('Volta para a masmorra em que você está'))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra as masmorras, seus recordes e o tempo de espera'))
    .addSubcommand((s) => s.setName('sair').setDescription('Sai da masmorra levando o saque (sem o bônus do Boss)')),

  async execute(interaction) {
    const canal = db.get('config.rpg.canal', null);
    if (canal && interaction.channelId !== canal) {
      return interaction.reply({ content: `Use o RPG em <#${canal}>.`, flags: EPH });
    }
    const id = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const j = N.obter(id);
    if (!j) return interaction.reply({ content: 'Crie seu personagem com `/rpg criar`.', flags: EPH });

    if (sub === 'status') {
      const linhas = D.ORDEM.map((k) => {
        const d = D.MASMORRAS[k];
        const r = (j.masm && j.masm[k]) || { concluidas: 0, melhor: 0 };
        const falta = N.restante(j, M.cdChave(k));
        const estado = j.nivel < d.nivelMin ? `🔒 Nv ${d.nivelMin}` : falta ? `⏳ ${N.fmt(falta)}` : '✅ Disponível';
        return `${d.emoji} **${d.nome}** (${d.dificuldade})\n${d.andares} andares · 5 bichos por andar + Boss **${d.boss.nome}** · recomendado ${d.recomendado}\n🏆 Concluída ${r.concluidas}x · 🧗 Mais fundo: andar ${r.melhor}/${d.andares} · ${estado}`;
      });
      const st = M.estado(id);
      const emb = new EmbedBuilder()
        .setColor(N.COR)
        .setTitle('🗝️ Masmorras')
        .setDescription(linhas.join('\n\n') + (st ? `\n\n📍 Você está em **${D.MASMORRAS[st.dif].nome}**, andar ${st.andar}. Use \`/masmorra continuar\`.` : ''))
        .setFooter({ text: 'O Boss dá muito XP. Leve poções: são muitas lutas seguidas.' });
      return interaction.reply({ embeds: [emb], flags: EPH });
    }

    if (sub === 'continuar') {
      const st = M.estado(id);
      if (!st) return interaction.reply({ content: 'Você não está em nenhuma masmorra. Use `/masmorra entrar`.', flags: EPH });
      await interaction.deferReply();
      return interaction.editReply(M.painel(id, st, j));
    }

    if (sub === 'sair') {
      const st = M.estado(id);
      if (!st) return interaction.reply({ content: 'Você não está em nenhuma masmorra.', flags: EPH });
      const res = M.sair(id, j, st);
      return interaction.reply({ embeds: [M.embedFinal('saiu', st, j, res)] });
    }

    // entrar
    if (M.estado(id)) return interaction.reply({ content: 'Você já está numa masmorra! Use `/masmorra continuar`.', flags: EPH });
    if (C.obterAtivo(id)) return interaction.reply({ content: 'Termine o combate de `/rpg explorar` antes de entrar numa masmorra.', flags: EPH });
    const dif = interaction.options.getString('dificuldade');
    const erro = M.validarEntrada(j, dif);
    if (erro) return interaction.reply({ content: erro, flags: EPH });
    const d = D.MASMORRAS[dif];
    const st = M.entrar(id, j, dif);
    await interaction.deferReply();
    const p = M.painel(id, st, j);
    p.content = `${d.emoji} **${j.personagem || interaction.user.username}** entra em **${d.nome}**!\n*${d.desc}*`;
    return interaction.editReply(p);
  },
};
