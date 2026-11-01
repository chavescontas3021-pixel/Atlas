const { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const N = require('../casamento/nucleo');
const Cer = require('../casamento/cerimonia');

const EPH = MessageFlags.Ephemeral;
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: { parse: [] } });
const ehStaff = (i) => !!(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.ManageGuild));

const STATUS = {
  agendado: '📅 Aguardando a cerimônia',
  andamento: '💒 Cerimônia acontecendo',
  interrompido: '⏸️ Cerimônia pausada',
  concluido: '🎉 Casados! (festa liberada)',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casamento')
    .setDescription('Casamentos da house')
    .addSubcommand((s) =>
      s
        .setName('liberar')
        .setDescription('(staff) Libera um casal para casar e cria o canal privado do casamento')
        .addUserOption((o) => o.setName('noivo1').setDescription('Um dos noivos').setRequired(true))
        .addUserOption((o) => o.setName('noivo2').setDescription('O outro noivo').setRequired(true))
    )
    .addSubcommand((s) => s.setName('iniciar').setDescription('(staff) Começa a cerimônia (use dentro do canal do casamento)'))
    .addSubcommand((s) =>
      s
        .setName('encerrar')
        .setDescription('(staff) Apaga o canal do casamento, depois da festa (use dentro dele)')
        .addBooleanOption((o) => o.setName('confirmar').setDescription('Marque sim para apagar o canal').setRequired(true))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('(staff) Mostra os casamentos que estão acontecendo'))
    .addSubcommand((s) =>
      s
        .setName('convidar')
        .setDescription('Os noivos convidam alguém para o casamento')
        .addUserOption((o) => o.setName('membro').setDescription('Quem convidar').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('desconvidar')
        .setDescription('Os noivos tiram um convidado do casamento')
        .addUserOption((o) => o.setName('membro').setDescription('Quem tirar').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('padrinho')
        .setDescription('Os noivos escolhem um padrinho ou madrinha para o casamento')
        .addUserOption((o) => o.setName('membro').setDescription('Quem será padrinho ou madrinha').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('tirarpadrinho')
        .setDescription('Os noivos tiram alguém dos padrinhos (a pessoa continua convidada)')
        .addUserOption((o) => o.setName('membro').setDescription('Quem tirar dos padrinhos').setRequired(true))
    )
    .addSubcommand((s) => s.setName('convidados').setDescription('Mostra a lista de convidados e os padrinhos do seu casamento'))
    .addSubcommand((s) => s.setName('info').setDescription('Mostra como está o seu casamento')),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    N.limparFantasmas(guild);

    // ---------- Staff ----------
    if (['liberar', 'iniciar', 'encerrar', 'lista'].includes(sub) && !ehStaff(interaction)) {
      return responder(interaction, '❌ Só a staff pode usar este comando.');
    }

    if (sub === 'liberar') {
      const ua = interaction.options.getUser('noivo1');
      const ub = interaction.options.getUser('noivo2');
      if (ua.bot || ub.bot) return responder(interaction, '❌ Bots não se casam. 🤖');
      if (ua.id === ub.id) return responder(interaction, '❌ Escolha duas pessoas diferentes.');
      for (const u of [ua, ub]) {
        if (N.casalDe(u.id)) return responder(interaction, `❌ ${u} já é casado(a).`);
        if (N.cerimoniaDe(u.id)) return responder(interaction, `❌ ${u} já tem um casamento marcado.`);
      }
      await interaction.deferReply({ flags: EPH });
      let canal;
      try {
        canal = await N.criarCanal(guild, ua, ub, interaction.user.id);
      } catch (e) {
        console.error('[Casamento] erro ao criar canal:', e);
        return interaction.editReply('⚠️ Não consegui criar o canal. Confira se eu tenho a permissão "Gerenciar canais" (e se a categoria não está cheia).');
      }
      N.salvarCerimonia({
        a: ua.id, b: ub.id, canalId: canal.id, status: 'agendado', convidados: [], criadoPor: interaction.user.id, criadoEm: Date.now(),
      });
      const emb = new EmbedBuilder()
        .setColor(N.COR)
        .setTitle('💒 Canal do casamento')
        .setDescription(
          `Bem-vindos, ${ua} e ${ub}! A staff liberou o casamento de vocês. 💕\n\n` +
            '**Como funciona**\n' +
            '• Este canal é **privado**: só entram os convidados de vocês.\n' +
            '• Para convidar alguém, um dos dois usa `/casamento convidar` (e `/casamento desconvidar` para tirar).\n' +
            `• Para escolher padrinhos e madrinhas (até ${N.limitePadrinhos()}), usem \`/casamento padrinho\`. Eles abençoam o casal durante a cerimônia.\n` +
            '• Quando todos estiverem aqui, avisem a staff: ela dá o comando para começar a cerimônia.\n' +
            `• O Atlas faz de padre: faz as perguntas e vocês respondem pelos botões. Limite de ${N.limiteConvidados()} convidados.`
        );
      await canal.send({ content: `${ua} ${ub}`, embeds: [emb], allowedMentions: { users: [ua.id, ub.id] } }).catch(() => {});
      return interaction.editReply(`✅ Casamento liberado! Canal: ${canal}`);
    }

    if (sub === 'iniciar') {
      const c = N.cerimoniaDoCanal(interaction.channelId);
      if (!c) return responder(interaction, '❌ Use este comando dentro do canal do casamento.');
      await interaction.deferReply({ flags: EPH });
      const r = await Cer.iniciar(interaction.client, c);
      if (r && r.erro) return interaction.editReply(`❌ ${r.erro}`);
      return interaction.editReply('💒 A cerimônia começou!');
    }

    if (sub === 'encerrar') {
      const c = N.cerimoniaDoCanal(interaction.channelId);
      if (!c) return responder(interaction, '❌ Use este comando dentro do canal do casamento.');
      if (!interaction.options.getBoolean('confirmar')) return responder(interaction, 'Ufa, o canal continua aqui. 💜');
      N.removerCerimonia(c.canalId);
      await interaction.reply({ content: '🧹 Encerrando: este canal será apagado em 5 segundos.', flags: EPH });
      const canal = interaction.channel;
      setTimeout(() => canal.delete('Casamento encerrado').catch((e) => console.error('[Casamento]', e.message)), 5000);
      return;
    }

    if (sub === 'lista') {
      const ativos = Object.values(N.cerimonias());
      if (!ativos.length) return responder(interaction, 'Nenhum casamento marcado no momento.');
      const txt = ativos.map((c) => `<#${c.canalId}> — <@${c.a}> e <@${c.b}> · ${STATUS[c.status] || c.status} · ${(c.convidados || []).length} convidado(s)`).join('\n');
      return responder(interaction, txt.slice(0, 1900));
    }

    // ---------- Noivos ----------
    const eu = interaction.user.id;
    const c = N.cerimoniaDe(eu);

    if (sub === 'info') {
      if (c) {
        const emb = new EmbedBuilder()
          .setColor(N.COR)
          .setTitle('💒 Seu casamento')
          .setDescription(`${N.mencao(c.a)} e ${N.mencao(c.b)}\n${STATUS[c.status] || c.status}\nCanal: <#${c.canalId}>\nConvidados: **${(c.convidados || []).length}** / ${N.limiteConvidados()}\nPadrinhos: ${(c.padrinhos || []).length ? c.padrinhos.map((id) => N.mencao(id)).join(' ') : 'ninguém ainda (use `/casamento padrinho`)'}`);
        return interaction.reply({ embeds: [emb], flags: EPH, allowedMentions: { parse: [] } });
      }
      const casal = N.casalDe(eu);
      if (casal) {
        const outro = casal.a === eu ? casal.b : casal.a;
        return interaction.reply({
          content: `💍 Você é casado(a) com ${N.mencao(outro)} desde ${new Date(casal.desde).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.`,
          flags: EPH,
          allowedMentions: { parse: [] },
        });
      }
      return responder(interaction, 'Você não tem casamento marcado. Para casar, combine com a staff! 💕');
    }

    if (!c) return responder(interaction, '❌ Só os noivos podem usar este comando, e só depois que a staff liberar o casamento.');
    const canal = guild.channels.cache.get(c.canalId);
    if (!canal) return responder(interaction, '⚠️ Não encontrei o canal do casamento. Avise a staff.');
    c.convidados = c.convidados || [];
    c.padrinhos = c.padrinhos || [];

    if (sub === 'convidados') {
      const txt = c.convidados.length ? c.convidados.map((id) => `• <@${id}>${c.padrinhos.includes(id) ? ' 💐' : ''}`).join('\n') : 'Ninguém convidado ainda. Use `/casamento convidar`.';
      const pad = c.padrinhos.length ? c.padrinhos.map((id) => `• <@${id}>`).join('\n') : 'Ninguém ainda. Use `/casamento padrinho`.';
      return interaction.reply({ content: `💌 **Convidados** (${c.convidados.length}/${N.limiteConvidados()})\n${txt}\n\n💐 **Padrinhos e madrinhas** (${c.padrinhos.length}/${N.limitePadrinhos()})\n${pad}`.slice(0, 1900), flags: EPH, allowedMentions: { parse: [] } });
    }

    const alvo = interaction.options.getUser('membro');

    if (sub === 'convidar') {
      if (alvo.bot) return responder(interaction, '❌ Convide pessoas, não bots. 🤖');
      if (N.ehNoivo(c, alvo.id)) return responder(interaction, '❌ Os noivos já estão no canal. 😄');
      if (c.convidados.includes(alvo.id)) return responder(interaction, 'ℹ️ Essa pessoa já foi convidada.');
      if (c.convidados.length >= N.limiteConvidados()) return responder(interaction, `❌ O limite é ${N.limiteConvidados()} convidados.`);
      try {
        await N.darAcesso(canal, alvo.id, c.status !== 'andamento');
      } catch (e) {
        return responder(interaction, '⚠️ Não consegui dar acesso ao canal. Avise a staff.');
      }
      c.convidados.push(alvo.id);
      N.salvarCerimonia(c);
      await canal.send({ content: `💌 ${interaction.user} convidou ${alvo}! Seja bem-vindo(a)!`, allowedMentions: { users: [alvo.id] } }).catch(() => {});
      alvo
        .send({ embeds: [new EmbedBuilder().setColor(N.COR).setTitle('💌 Você foi convidado(a)!').setDescription(`${interaction.user.username} convidou você para o casamento de ${N.mencao(c.a)} e ${N.mencao(c.b)} em **${guild.name}**.\nO canal é ${canal}.`)] })
        .catch(() => {});
      return responder(interaction, `✅ ${alvo} foi convidado(a) e já pode ver o canal ${canal}.`);
    }

    if (sub === 'padrinho' || sub === 'tirarpadrinho') {
      if (c.status === 'andamento') return responder(interaction, '⏳ A cerimônia está acontecendo agora. Os padrinhos já não podem mudar.');
      if (c.status === 'concluido') return responder(interaction, '💍 A cerimônia já aconteceu, então os padrinhos já estão registrados.');
    }

    if (sub === 'padrinho') {
      if (alvo.bot) return responder(interaction, '❌ Escolha uma pessoa, não um bot. 🤖');
      if (N.ehNoivo(c, alvo.id)) return responder(interaction, '❌ Os noivos não podem ser os próprios padrinhos. 😄');
      if (c.padrinhos.includes(alvo.id)) return responder(interaction, 'ℹ️ Essa pessoa já é padrinho ou madrinha do casamento.');
      if (c.padrinhos.length >= N.limitePadrinhos()) return responder(interaction, `❌ O limite é ${N.limitePadrinhos()} padrinhos e madrinhas. Use \`/casamento tirarpadrinho\` para trocar alguém.`);
      const jaConvidado = c.convidados.includes(alvo.id);
      if (!jaConvidado && c.convidados.length >= N.limiteConvidados()) return responder(interaction, `❌ O limite é ${N.limiteConvidados()} convidados.`);
      try {
        await N.darAcesso(canal, alvo.id, c.status !== 'andamento');
      } catch (e) {
        return responder(interaction, '⚠️ Não consegui dar acesso ao canal. Avise a staff.');
      }
      if (!jaConvidado) c.convidados.push(alvo.id);
      c.padrinhos.push(alvo.id);
      N.salvarCerimonia(c);
      await canal.send({ content: `💐 ${interaction.user} escolheu ${alvo} como padrinho/madrinha do casamento! Que honra!`, allowedMentions: { users: [alvo.id] } }).catch(() => {});
      if (!jaConvidado) {
        alvo
          .send({ embeds: [new EmbedBuilder().setColor(N.COR).setTitle('💐 Você foi escolhido(a) como padrinho/madrinha!').setDescription(`${interaction.user.username} escolheu você para ser padrinho ou madrinha do casamento de ${N.mencao(c.a)} e ${N.mencao(c.b)} em **${guild.name}**.\nO canal é ${canal}.`)] })
          .catch(() => {});
      }
      return responder(interaction, `✅ ${alvo} agora é padrinho/madrinha do casamento (${c.padrinhos.length}/${N.limitePadrinhos()}).`);
    }

    if (sub === 'tirarpadrinho') {
      if (!c.padrinhos.includes(alvo.id)) return responder(interaction, 'ℹ️ Essa pessoa não é padrinho nem madrinha.');
      c.padrinhos = c.padrinhos.filter((id) => id !== alvo.id);
      N.salvarCerimonia(c);
      return responder(interaction, `✅ ${alvo} saiu dos padrinhos (continua convidado(a)). Se quiser tirar do canal também, use \`/casamento desconvidar\`.`);
    }

    if (sub === 'desconvidar') {
      if (!c.convidados.includes(alvo.id)) return responder(interaction, 'ℹ️ Essa pessoa não está na lista de convidados.');
      await canal.permissionOverwrites.delete(alvo.id).catch(() => {});
      c.convidados = c.convidados.filter((id) => id !== alvo.id);
      c.padrinhos = c.padrinhos.filter((id) => id !== alvo.id);
      N.salvarCerimonia(c);
      return responder(interaction, `✅ ${alvo} foi retirado(a) da lista de convidados.`);
    }
  },
};
