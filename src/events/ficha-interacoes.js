const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const N = require('../ficha/nucleo');

const EPH = MessageFlags.Ephemeral;

const ehStaff = (interaction) => !!(interaction.memberPermissions && interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild));

async function autocompletar(interaction) {
  const foco = N.norm(interaction.options.getFocused());
  const membro = interaction.options.get('membro');
  const uid = membro ? membro.value : interaction.user.id;
  const res = N.doUsuario(uid)
    .filter((f) => N.norm(f.nome).includes(foco))
    .slice(0, 25)
    .map((f) => ({ name: `${f.nome} (${f.obra})`.slice(0, 100), value: f.id }));
  await interaction.respond(res).catch(() => {});
}

function lerCampos(interaction, campos) {
  const v = {};
  for (const c of campos) {
    let t = '';
    try { t = interaction.fields.getTextInputValue(c.id) || ''; } catch { t = ''; }
    v[c.id] = t.trim();
  }
  return v;
}

async function modal(interaction) {
  const [, , tipo, id] = interaction.customId.split(':');
  await interaction.deferReply({ flags: EPH });
  const guild = interaction.guild;

  if (!N.cfg('canal')) return interaction.editReply('❌ A staff ainda não definiu o canal das fichas.');

  if (tipo === 'criar') {
    if (N.doUsuario(interaction.user.id).length >= N.limite()) {
      return interaction.editReply(`❌ Você já atingiu o limite de **${N.limite()}** ficha(s).`);
    }
    const v = lerCampos(interaction, N.CAMPOS_A);
    if (!v.nome || !v.obra || !v.personalidade) return interaction.editReply('❌ Nome, obra e personalidade são obrigatórios.');
    if (N.nomeEmUso(interaction.user.id, v.nome)) return interaction.editReply('❌ Você já tem uma ficha com esse nome.');
    const f = { id: N.proximoId(), userId: interaction.user.id, ...v, criadoEm: Date.now() };
    try {
      await N.publicar(guild, f, interaction.user, null);
    } catch {
      return interaction.editReply('❌ Não consegui publicar a ficha no canal (falta permissão?).');
    }
    return interaction.editReply(`✅ Ficha de **${f.nome}** criada! Agora use \`/ficha detalhes\` para completar e \`/ficha imagem\` para pôr a imagem.`);
  }

  const f = N.obter(id);
  if (!f) return interaction.editReply('❌ Essa ficha não existe mais.');
  if (f.userId !== interaction.user.id && !ehStaff(interaction)) {
    return interaction.editReply('❌ Só a staff pode mexer na ficha de outra pessoa.');
  }

  if (tipo === 'editar') {
    const v = lerCampos(interaction, N.CAMPOS_A);
    if (!v.nome || !v.obra || !v.personalidade) return interaction.editReply('❌ Nome, obra e personalidade são obrigatórios.');
    if (N.nomeEmUso(f.userId, v.nome, f.id)) return interaction.editReply('❌ Já existe outra ficha sua com esse nome.');
    Object.assign(f, v);
  } else if (tipo === 'detalhes') {
    Object.assign(f, lerCampos(interaction, N.CAMPOS_B));
  } else {
    return interaction.editReply('❌ Formulário desconhecido.');
  }

  try {
    const dono = await interaction.client.users.fetch(f.userId);
    await N.publicar(guild, f, dono, null);
  } catch {
    return interaction.editReply('❌ Salvei os dados, mas não consegui atualizar a mensagem no canal (falta permissão?).');
  }
  return interaction.editReply('✅ Ficha atualizada!');
}

async function apagar(interaction) {
  const id = interaction.customId.split(':')[2];
  const f = N.obter(id);
  if (!f) return interaction.update({ content: 'Essa ficha já foi apagada.', components: [] });
  if (f.userId !== interaction.user.id && !ehStaff(interaction)) {
    return interaction.reply({ content: '❌ Só o dono da ficha ou a staff pode apagar.', flags: EPH });
  }
  await interaction.update({ content: '⏳ Apagando...', components: [] });
  await N.apagarFicha(interaction.guild, f);
  return interaction.editReply({ content: `🗑️ Ficha de **${f.nome}** apagada.` });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      if (interaction.isAutocomplete() && interaction.commandName === 'ficha') return await autocompletar(interaction);
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ficha:modal:')) return await modal(interaction);
      if (interaction.isButton() && interaction.customId.startsWith('ficha:apagar:')) return await apagar(interaction);
    } catch (err) {
      console.error('[Ficha]', err);
      try {
        if (interaction.isRepliable && interaction.isRepliable()) {
          const msg = 'Deu erro na ficha. Tente de novo.';
          if (interaction.deferred || interaction.replied) await interaction.editReply(msg);
          else await interaction.reply({ content: msg, flags: EPH });
        }
      } catch { /* ignora */ }
    }
  },
};
