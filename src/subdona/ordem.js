// ─────────────────────────────────────────────────────────────
//  ATLAS · sub dona · ordens
//  Junta tudo: confere o poder (desligado / confirma / automático), pede o clique
//  quando precisa, executa, anota no diário e oferece o botão Desfazer.
//  Usado pelas ordens por conversa (e, na parte 2, pelas ações automáticas).
// ─────────────────────────────────────────────────────────────
const UI = require('../ui/componentes');
const { S } = require('../ui/tema');
const N = require('./nucleo');
const A = require('./acoes');

const SEM_PING = { parse: [] };

// ctx: { client, guild, canal, executor (GuildMember), executorUser, msgId }
async function pedir(ctx, acao, params, { origem = 'ordem' } = {}) {
  if (!N.ativo()) return { payload: UI.aviso('O modo sub dona está desligado. Só o pai liga, em `/subdona modo`.', { publica: true }) };
  ctx.ehPai = await N.ehPai(ctx.client, ctx.executorUser.id);
  const poder = A.PODER_DE[acao];
  const modo = N.modo(poder);
  if (modo === 'off') return { payload: UI.erro(`O poder **${N.PODERES[poder].nome}** está desligado. O pai liga em \`/subdona poder\`.`, { publica: true }) };

  const erroPerm = await A.conferirPermissao(ctx, acao);
  if (erroPerm) return { payload: UI.erro(erroPerm, { publica: true }) };

  if (modo === 'confirma') {
    const token = N.guardarPendente({ acao, params: { ...params, canalAlvo: undefined, canalId: params.canalAlvo ? params.canalAlvo.id : null }, executor: ctx.executorUser.id, canalId: ctx.canal.id, guildId: ctx.guild.id, msgId: ctx.msgId, origem });
    return {
      payload: {
        embeds: [UI.painel({
          trilha: ['Sub dona', 'Confirmação'],
          titulo: A.ROTULO[acao] || 'Confirmar',
          descricao: A.descrever(acao, params),
          rodape: 'Só quem mandou pode confirmar  ·  vale por 3 minutos',
          perigo: ['banir', 'expulsar'].includes(acao),
        })],
        components: [UI.linha(
          UI.botao({ id: `sd:ok:${token}`, label: 'Confirmar', estilo: ['banir', 'expulsar'].includes(acao) ? 'perigo' : 'neutro' }),
          UI.botao({ id: `sd:no:${token}`, label: 'Cancelar' }),
        )],
        allowedMentions: SEM_PING,
      },
    };
  }
  return { payload: await rodar(ctx, acao, params, origem) };
}

// Executa de verdade, anota e monta a resposta
async function rodar(ctx, acao, params, origem = 'ordem') {
  const r = await A.executar(acao, params, ctx);
  if (!r.ok) return { ...UI.erro(r.texto, { publica: true }), allowedMentions: SEM_PING };
  const id = N.registrar({
    acao, executor: ctx.executorUser.id, alvo: params.alvo || null, motivo: params.motivo || '', texto: r.texto.replace(/\*\*/g, ''), desfazer: r.desfazer, origem, guildId: ctx.guild.id,
  });
  const payload = { ...UI.ok(r.texto, { publica: true }), allowedMentions: SEM_PING };
  if (r.desfazer) payload.components = [UI.linha(UI.botao({ id: `sd:undo:${id}`, label: 'Desfazer' }))];
  return payload;
}

// Clique em Confirmar / Cancelar
async function aoClicarConfirmacao(interaction, client, ok, token) {
  const p = N.pegarPendente(token);
  if (!p) return interaction.update({ ...UI.edicao(UI.aviso('Esse pedido expirou. Mande a ordem de novo.')), components: [] });
  const ehPai = await N.ehPai(client, interaction.user.id);
  const delegadoOk = p.executor === 'auto' && N.ehDelegado(interaction.user.id);
  if (interaction.user.id !== p.executor && !ehPai && !delegadoOk) return interaction.reply(UI.erro('Só o pai, os delegados ou quem mandou confirmam isso.'));
  N.soltarPendente(token);
  if (!ok) return interaction.update({ ...UI.edicao(UI.aviso('Cancelado. Nada foi feito.')), components: [] });

  await interaction.deferUpdate();
  const guild = interaction.guild;
  const executor = p.executor === 'auto' ? guild.members.me : await guild.members.fetch(p.executor).catch(() => interaction.member);
  const canal = guild.channels.cache.get(p.canalId) || interaction.channel;
  const params = { ...p.params, canalAlvo: p.params.canalId ? guild.channels.cache.get(p.params.canalId) : undefined };
  const ctx = { client, guild, canal, executor, executorUser: executor.user, msgId: p.msgId, ehPai: p.executor === 'auto' ? false : await N.ehPai(client, p.executor) };
  const payload = await rodar(ctx, p.acao, params, p.origem);
  return interaction.editReply({ ...UI.edicao(payload), components: payload.components || [] });
}

// Clique em Desfazer
async function aoDesfazer(interaction, client, id) {
  const d = N.obter(id);
  if (!d || !d.desfazer) return interaction.reply(UI.erro('Não dá mais para desfazer isso.'));
  if (d.desfeito) return interaction.reply(UI.aviso('Isso já foi desfeito.'));
  const ehPai = await N.ehPai(client, interaction.user.id);
  if (interaction.user.id !== d.executor && !ehPai) return interaction.reply(UI.erro('Só quem mandou (ou o pai) desfaz isso.'));
  await interaction.deferUpdate();
  const guild = interaction.guild;
  const { acao, canalId, ...resto } = d.desfazer;
  const canal = canalId ? guild.channels.cache.get(canalId) : interaction.channel;
  const ctx = { client, guild, canal: interaction.channel, executor: interaction.member, executorUser: interaction.user, ehPai };
  const r = await A.executar(acao, { ...resto, canalAlvo: canal, canalId }, ctx);
  if (!r.ok) return interaction.followUp({ ...UI.erro(r.texto), allowedMentions: SEM_PING });
  N.marcarDesfeito(id);
  N.registrar({ acao: `desfazer:${d.acao}`, executor: interaction.user.id, alvo: d.alvo, texto: r.texto.replace(/\*\*/g, ''), origem: 'ordem', guildId: guild.id });
  return interaction.editReply({ ...UI.edicao(UI.ok(`Desfeito. ${r.texto}`, { publica: true })), components: [], allowedMentions: SEM_PING });
}

module.exports = { pedir, rodar, aoClicarConfirmacao, aoDesfazer };
