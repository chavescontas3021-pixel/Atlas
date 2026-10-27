const { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const N = require('../casamento/nucleo');

const EPH = MessageFlags.Ephemeral;
const responder = (i, content) => i.reply({ content, flags: EPH, allowedMentions: { parse: [] } });

// Desfaz o casal: tira dos registros, do cargo de casado e libera para casar de novo
async function desfazer(guild, casal) {
  db.remover(`casamento.casais.${casal.id}`);
  db.remover(`casamento.casalDe.${casal.a}`);
  db.remover(`casamento.casalDe.${casal.b}`);
  db.remover(`casamento.mimos.${casal.id}`); // usado pelos mimos/ranking, se existirem

  // O registro da cerimônia antiga (já concluída) também sai, senão o casal não poderia casar de novo
  for (const c of Object.values(N.cerimonias())) {
    if (c.status === 'concluido' && [c.a, c.b].some((u) => u === casal.a || u === casal.b)) N.removerCerimonia(c.canalId);
  }

  const cargoId = N.cfg('cargo');
  if (cargoId) {
    for (const uid of [casal.a, casal.b]) {
      const m = await guild.members.fetch(uid).catch(() => null);
      if (m) await m.roles.remove(cargoId).catch(() => {});
    }
  }
}

function tempoJuntos(desde) {
  const dias = Math.max(0, Math.floor((Date.now() - desde) / 86400000));
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('divorcio')
    .setDescription('Encerra o seu casamento (staff pode encerrar o de outro membro)')
    .addBooleanOption((o) => o.setName('confirmar').setDescription('Marque sim para confirmar o divórcio').setRequired(true))
    .addUserOption((o) => o.setName('membro').setDescription('(staff) Divorciar o casal de outro membro')),

  async execute(interaction) {
    if (!interaction.inGuild()) return responder(interaction, 'Use este comando no servidor.');
    const alvo = interaction.options.getUser('membro');
    const ehStaff = !!(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));
    if (alvo && alvo.id !== interaction.user.id && !ehStaff) {
      return responder(interaction, '❌ Só a staff pode divorciar o casal de outra pessoa.');
    }
    const quem = alvo || interaction.user;
    const casal = N.casalDe(quem.id);
    if (!casal) {
      return responder(interaction, quem.id === interaction.user.id ? 'Você não está casado(a). 💜' : `${quem} não está casado(a).`);
    }
    if (!interaction.options.getBoolean('confirmar')) return responder(interaction, 'Ufa, o casamento continua! 💕');

    const ex = casal.a === quem.id ? casal.b : casal.a;
    const juntos = tempoJuntos(casal.desde);
    await desfazer(interaction.guild, casal);

    // Avisa a outra pessoa por mensagem privada (sem expor o divórcio em público)
    const outro = await interaction.client.users.fetch(ex).catch(() => null);
    if (outro && ex !== interaction.user.id) {
      outro
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(N.COR)
              .setTitle('💔 Casamento encerrado')
              .setDescription(`O casamento com ${quem.username} em **${interaction.guild.name}** foi encerrado (${juntos} juntos). Sinto muito.`),
          ],
        })
        .catch(() => {});
    }
    return interaction.reply({
      content: `💔 O casamento de ${N.mencao(casal.a)} e ${N.mencao(casal.b)} foi encerrado (${juntos} juntos). Cuidem-se.`,
      flags: EPH,
      allowedMentions: { parse: [] },
    });
  },
};
