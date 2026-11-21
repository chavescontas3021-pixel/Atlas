// ATLAS · formulário de servidor, lado do dono: pedido recebido, proposta, andamento, entrega e painel "fsd:"
const { AttachmentBuilder, EmbedBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const D = require('./dados');
const M = require('./modelo');
const Modo = require('../modo/nucleo');
const F = require('./fluxo');

const LIMITE_ARQ = 8 * 1024 * 1024;
const dh = (ms) => `<t:${Math.floor(ms / 1000)}:f>`;
const corta = (t, n) => { const a = [...String(t)]; return a.length > n ? `${a.slice(0, n - 1).join('')}…` : String(t); };

function tela(p, aviso = '') {
  const e = new EmbedBuilder().setColor(M.COR).setTitle(`Pedido de servidor ${p.id}`)
    .setDescription(`Cliente: <@${p.userId}> (${p.nome || p.usuario})\nSituação: **${M.STATUS[p.status]}**${p.enviadoEm ? `\nEnviado: ${dh(p.enviadoEm)}` : ''}\n\n${D.linhas(p).map(([q, r]) => `**${q}**\n${r}`).join('\n\n')}`.slice(0, 4000));
  if (p.orcamento) e.addFields({ name: 'Proposta', value: corta(`Valor: ${p.orcamento.valor}\nEntrega: ${p.orcamento.prazo}${p.orcamento.obs ? `\n${p.orcamento.obs}` : ''}`, 1000) });
  const b = [];
  if (p.status === 'enviado') b.push(F.btn(`fsd:ap:${p.id}`, 'Aprovar e enviar proposta', ButtonStyle.Success), F.btn(`fsd:aj:${p.id}`, 'Pedir ajustes'), F.btn(`fsd:rc:${p.id}`, 'Recusar', ButtonStyle.Danger));
  if (p.status === 'aceito') b.push(F.btn(`fsd:and:${p.id}`, 'Iniciar', ButtonStyle.Primary));
  if (p.status === 'aceito' || p.status === 'andamento') b.push(F.btn(`fsd:en:${p.id}`, 'Entregar', ButtonStyle.Success));
  b.push(F.btn('fsd:lst', 'Painel'));
  return { content: aviso, embeds: [e], components: [F.linha(...b)], allowedMentions: { parse: [] } };
}

async function mandarAoDono(client, payload) {
  const id = await Modo.donoId(client); if (!id) return null;
  try { return await (await client.users.fetch(id)).send(payload); } catch (e) { console.error('[Forms] DM ao dono:', e.message); return null; }
}
async function enviarAoCliente(client, p, payload) {
  try { await (await client.users.fetch(p.userId)).send(payload); return true; } catch { return false; }
}

// Reenvia os arquivos do cliente (os links do Discord expiram) e a lista pronta para /criar
async function anexos(client, p) {
  for (const [k, a] of Object.entries(p.anexos || {})) {
    const arqs = []; const links = [];
    for (const f of a.arquivos || []) {
      try {
        if (f.tam > LIMITE_ARQ) { links.push(f.url); continue; }
        const r = await fetch(f.url); arqs.push(new AttachmentBuilder(Buffer.from(await r.arrayBuffer()), { name: f.nome }));
      } catch { links.push(f.url); }
    }
    const texto = (a.textos || []).join('\n').trim();
    const cab = `**${M.ROTULO_ANEXO[k]}** · pedido ${p.id}`;
    for (let i = 0; i < arqs.length; i += 10) await mandarAoDono(client, { content: i ? '' : cab, files: arqs.slice(i, i + 10) });
    if (links.length) await mandarAoDono(client, { content: `${cab}\nArquivos grandes (links):\n${links.join('\n')}`.slice(0, 1900) });
    if (texto) {
      if (texto.length <= 1700) await mandarAoDono(client, { content: `${arqs.length ? '' : `${cab}\n`}\`\`\`\n${texto}\n\`\`\``, allowedMentions: { parse: [] } });
      else await mandarAoDono(client, { content: arqs.length ? '' : cab, files: [new AttachmentBuilder(Buffer.from(texto, 'utf8'), { name: `${k}-${p.id}.txt` })] });
    }
  }
}

async function notificar(client, p, aviso = 'Novo pedido de servidor.') {
  await mandarAoDono(client, tela(p, aviso));
  await anexos(client, p);
}
const avisar = (client, p, txt) => mandarAoDono(client, tela(p, txt));

const painel = () => {
  const l = Object.values(D.todos()).filter((p) => p.status !== 'rascunho' && p.status !== 'cancelado').sort((a, b) => (b.enviadoEm || 0) - (a.enviadoEm || 0));
  const c = {}; for (const p of l) c[p.status] = (c[p.status] || 0) + 1;
  const e = new EmbedBuilder().setColor(M.COR).setTitle('Pedidos de servidor')
    .setDescription(l.length ? Object.entries(c).map(([s, n]) => `${M.STATUS[s]}: **${n}**`).join('\n') + (l.length > 25 ? '\n\nMostrando os 25 mais recentes.' : '') + '\n\nEscolha um pedido para abrir.' : 'Nenhum pedido ainda. Use `/forms servidor`.');
  const comp = l.length ? [new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('fsd:sel').setPlaceholder('Abrir um pedido').addOptions(l.slice(0, 25).map((p) => ({ label: corta(`${p.nome || p.usuario} · ${M.STATUS[p.status]}`, 100), description: corta(`${p.id} · ${M.nome(M.SERVICOS, p.r.servico)}`, 100), value: p.id }))))] : [];
  return { content: '', embeds: [e], components: comp, allowedMentions: { parse: [] } };
};

const campo = (id, label, o = {}) => ({ id, label, ...o });
async function tratar(interaction, client) {
  if (!(await Modo.ehDono(client, interaction.user.id))) return interaction.reply({ content: 'Isto é só do dono.', ephemeral: true });
  const [, acao, id] = interaction.customId.split(':');
  const ver = (i, pl) => (i.isMessageComponent() || (i.isFromMessage && i.isFromMessage()) ? i.update(pl) : i.reply(pl));
  if (acao === 'lst') return interaction.update(painel());
  if (acao === 'sel') { const p = D.obter(interaction.values[0]); return interaction.update(p ? tela(p) : painel()); }
  const p = D.obter(id);
  if (!p) return ver(interaction, { content: 'Esse pedido não existe mais.', embeds: [], components: [] });
  const V = (n) => interaction.fields.getTextInputValue(n).trim();
  const abrir = (acaoM, titulo, campos) => interaction.showModal(F.modal(`fsd:${acaoM}:${id}`, titulo, campos));

  if (acao === 'ap') return abrir('map', 'Proposta ao cliente', [campo('valor', 'Valor', { dica: 'Ex.: R$ 150 ou a combinar', max: 60 }), campo('prazo', 'Prazo de entrega', { dica: 'Ex.: 5 dias', max: 60 }), campo('obs', 'Observações (opcional)', { longo: true, max: 500, obrigatorio: false })]);
  if (acao === 'aj') return abrir('maj', 'Pedir ajustes', [campo('txt', 'O que precisa ser ajustado?', { longo: true, max: 800 })]);
  if (acao === 'rc') return abrir('mrc', 'Recusar pedido', [campo('txt', 'Motivo (o cliente vai ler)', { longo: true, max: 500 })]);
  if (acao === 'en') return abrir('men', 'Entregar', [campo('link', 'Link do servidor', { max: 200, obrigatorio: false }), campo('obs', 'Observações para o cliente', { longo: true, max: 600, obrigatorio: false })]);

  if (acao === 'map' && p.status === 'enviado') {
    p.orcamento = { valor: V('valor'), prazo: V('prazo'), obs: V('obs') }; p.status = 'orcamento'; D.salvar(p);
    const ok = await enviarAoCliente(client, p, { embeds: [new EmbedBuilder().setColor(M.COR).setTitle('Proposta para o seu servidor').setDescription(`Valor: **${p.orcamento.valor}**\nPrazo de entrega: **${p.orcamento.prazo}**${p.orcamento.obs ? `\n\n${p.orcamento.obs}` : ''}\n\nO prazo só começa a contar depois que você aceitar.`)], components: [F.linha(F.btn(`fs:ok:${p.id}`, 'Aceitar proposta', ButtonStyle.Success), F.btn(`fs:neg:${p.id}`, 'Negociar'), F.btn(`fs:nao:${p.id}`, 'Recusar', ButtonStyle.Danger))] });
    return ver(interaction, tela(p, ok ? 'Proposta enviada ao cliente.' : 'Não consegui enviar a DM ao cliente. Avise por outro meio.'));
  }
  if (acao === 'maj' && p.status === 'enviado') {
    p.status = 'ajustes'; D.salvar(p);
    const ok = await enviarAoCliente(client, p, { embeds: [new EmbedBuilder().setColor(M.COR).setTitle('Ajustes no seu pedido').setDescription(`Antes de seguir, precisamos de alguns ajustes:\n\n${V('txt')}`)], components: [F.linha(F.btn(`fs:re:${p.id}`, 'Revisar e reenviar', ButtonStyle.Primary))] });
    return ver(interaction, tela(p, ok ? 'Pedido de ajustes enviado ao cliente.' : 'Não consegui enviar a DM ao cliente.'));
  }
  if (acao === 'mrc' && p.status === 'enviado') {
    p.status = 'recusado'; D.salvar(p);
    const ok = await enviarAoCliente(client, p, { embeds: [new EmbedBuilder().setColor(M.COR).setTitle('Sobre o seu pedido').setDescription(`Não vamos conseguir atender este pedido.\n\n${V('txt')}`)] });
    return ver(interaction, tela(p, ok ? 'Recusa enviada ao cliente.' : 'Não consegui enviar a DM ao cliente.'));
  }
  if (acao === 'and' && p.status === 'aceito') {
    p.status = 'andamento'; D.salvar(p);
    await enviarAoCliente(client, p, { embeds: [new EmbedBuilder().setColor(M.COR).setDescription('O trabalho no seu servidor **começou**. Você será avisado na entrega.')] });
    return interaction.update(tela(p, 'Cliente avisado: em andamento.'));
  }
  if (acao === 'men' && (p.status === 'aceito' || p.status === 'andamento')) {
    p.status = 'entregue'; p.entregueEm = Date.now(); D.salvar(p);
    const link = V('link'), obs = V('obs');
    const ok = await enviarAoCliente(client, p, { embeds: [new EmbedBuilder().setColor(M.COR).setTitle('Seu servidor está pronto').setDescription(`${link ? `Acesso: ${link}\n\n` : ''}${obs || 'Qualquer ajuste, é só responder por aqui.'}`)] });
    return ver(interaction, tela(p, ok ? 'Entrega enviada ao cliente.' : 'Não consegui enviar a DM ao cliente.'));
  }
  return ver(interaction, tela(p, 'Esse pedido mudou de situação. Veja abaixo.'));
}

module.exports = { tela, painel, notificar, avisar, tratar, mandarAoDono };
