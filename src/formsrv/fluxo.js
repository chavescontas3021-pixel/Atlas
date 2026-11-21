// ATLAS · formulário de servidor, lado do cliente (na DM): botões, menus e janelas "fs:"
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const D = require('./dados');
const M = require('./modelo');

const btn = (id, rotulo, estilo = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(id).setLabel(rotulo).setStyle(estilo);
const linha = (...c) => new ActionRowBuilder().addComponents(...c);
const menu = (id, ph, ops) => linha(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(ph).addOptions(ops.map((o) => ({ label: o.n, value: o.v, ...(o.d ? { description: o.d } : {}) }))));
const modal = (id, titulo, campos) => {
  const m = new ModalBuilder().setCustomId(id).setTitle(titulo.slice(0, 45));
  for (const c of campos) {
    const t = new TextInputBuilder().setCustomId(c.id).setLabel(c.label.slice(0, 45)).setStyle(c.longo ? TextInputStyle.Paragraph : TextInputStyle.Short).setMaxLength(c.max || 300).setRequired(c.obrigatorio !== false);
    if (c.dica) t.setPlaceholder(c.dica);
    m.addComponents(linha(t));
  }
  return m;
};
const saida = (i, pl) => (i.isMessageComponent() || (i.isFromMessage && i.isFromMessage()) ? i.update(pl) : i.reply(pl));

function intro(p, nome) {
  return {
    embeds: [new EmbedBuilder().setColor(M.COR).setTitle('Solicitação de servidor').setDescription(M.INTRO(nome))],
    components: [linha(btn(`fs:ini:${p.id}`, 'Aceitar e começar', ButtonStyle.Primary), btn(`fs:no:${p.id}`, 'Agora não'))],
  };
}

function tela(p, aviso = '') {
  const e = M.etapas(p); const total = e.length - 1; const i = Math.max(0, e.indexOf(p.etapa));
  const emb = new EmbedBuilder().setColor(M.COR).setFooter({ text: p.etapa === 'revisao' ? `Pedido ${p.id} · revisão` : `Pedido ${p.id} · pergunta ${i + 1} de ${total}` });
  const id = p.id;
  if (p.coletando) {
    const k = p.coletando; const a = p.anexos[k] || {};
    emb.setTitle(M.PERGUNTAS[k]).setDescription(`${M.COLETA[k]}\nPode mandar em várias mensagens. Quando terminar, clique em **Concluir**.\n\nRecebido até agora: **${(a.arquivos || []).length}** arquivo(s) e **${(a.textos || []).length}** mensagem(ns) de texto.`);
    return { content: aviso, embeds: [emb], components: [linha(btn(`fs:pr:${id}`, 'Concluir', ButtonStyle.Success), btn(`fs:yn:${id}:${k}:nao`, 'Não tenho'))] };
  }
  if (p.etapa === 'servico') return { content: aviso, embeds: [emb.setTitle(M.PERGUNTAS.servico).setDescription('Escolha uma opção.')], components: [menu(`fs:sv:${id}`, 'Escolha o serviço', M.SERVICOS)] };
  if (p.etapa === 'prazo') return { content: aviso, embeds: [emb.setTitle(M.PERGUNTAS.prazo).setDescription('Escolha uma opção.')], components: [menu(`fs:pz:${id}`, 'Escolha o prazo', M.PRAZOS)] };
  if (p.etapa === 'tipo') return { content: aviso, embeds: [emb.setTitle(M.PERGUNTAS.tipo).setDescription('Escolha uma opção.')], components: [menu(`fs:tp:${id}`, 'Escolha o tipo', M.TIPOS)] };
  if (p.etapa === 'lista') return { content: aviso, embeds: [emb.setTitle(M.PERGUNTAS.lista).setDescription('Se sim, você escreve a lista em seguida. Se preferir, montamos a estrutura por você.')], components: [linha(btn(`fs:yn:${id}:lista:sim`, 'Vou fazer a lista', ButtonStyle.Primary), btn(`fs:yn:${id}:lista:nao`, 'Prefiro que montem'))] };
  if (M.COLETA[p.etapa]) return { content: aviso, embeds: [emb.setTitle(M.PERGUNTAS[p.etapa]).setDescription('Se sim, você envia o material em seguida.')], components: [linha(btn(`fs:yn:${id}:${p.etapa}:sim`, 'Sim', ButtonStyle.Primary), btn(`fs:yn:${id}:${p.etapa}:nao`, 'Não'))] };
  // revisão
  const falta = D.faltando(p);
  emb.setTitle('Revise o seu pedido').setDescription(D.linhas(p).map(([q, r]) => `**${q}**\n${r}`).join('\n\n').slice(0, 3900));
  return { content: aviso, embeds: [emb], components: [linha(btn(`fs:env:${id}`, 'Enviar pedido', ButtonStyle.Success).setDisabled(falta.length > 0), btn(`fs:rec:${id}`, 'Recomeçar'), btn(`fs:can:${id}`, 'Cancelar', ButtonStyle.Danger))] };
}

const fim = (txt) => ({ content: '', embeds: [new EmbedBuilder().setColor(M.COR).setDescription(txt)], components: [] });
const expirado = () => fim('Este pedido não está mais ativo.');

async function tratar(interaction, client) {
  const [, acao, id, a, b] = interaction.customId.split(':');
  const p = D.obter(id);
  if (!p || p.userId !== interaction.user.id) return saida(interaction, expirado());
  const ativo = p.status === 'rascunho';
  const vai = (aviso = '') => { D.salvar(p); return saida(interaction, tela(p, aviso)); };

  // proposta do dono
  if (['ok', 'nao', 'neg', 'mneg'].includes(acao)) {
    if (p.status !== 'orcamento') return saida(interaction, fim('Esta proposta não está mais aberta.'));
    const Dono = require('./dono');
    if (acao === 'neg') return interaction.showModal(modal(`fs:mneg:${id}`, 'Negociar a proposta', [{ id: 'msg', label: 'O que você gostaria de mudar?', longo: true, max: 800 }]));
    if (acao === 'mneg') { await Dono.avisar(client, p, `O cliente quer **negociar** a proposta:\n> ${interaction.fields.getTextInputValue('msg')}`); return interaction.reply({ content: 'Mensagem enviada. Você receberá a resposta aqui.' }); }
    if (acao === 'ok') { p.status = 'aceito'; p.aceiteEm = Date.now(); D.salvar(p); await Dono.avisar(client, p, 'O cliente **aceitou** a proposta.'); return saida(interaction, fim('Proposta aceita. O prazo começa a contar agora. Você será avisado a cada etapa.')); }
    p.status = 'recusado'; D.salvar(p); await Dono.avisar(client, p, 'O cliente **recusou** a proposta.');
    return saida(interaction, fim('Proposta recusada. Se mudar de ideia, é só pedir um novo formulário.'));
  }
  if (acao === 're') { if (p.status !== 'ajustes') return saida(interaction, expirado()); p.status = 'rascunho'; p.etapa = 'revisao'; p.coletando = null; return vai(); }
  if (!ativo) return saida(interaction, expirado());

  if (acao === 'no' || acao === 'can') { p.status = 'cancelado'; D.salvar(p); return saida(interaction, fim('Tudo bem, o pedido foi cancelado. Se mudar de ideia, é só pedir um novo formulário.')); }
  if (acao === 'ini') return vai();
  if (acao === 'rec') { p.r = {}; p.anexos = {}; p.coletando = null; p.etapa = 'servico'; return vai(); }

  if (acao === 'sv') {
    p.r.servico = interaction.values[0];
    if (p.r.servico === 'outros') return interaction.showModal(modal(`fs:mo:${id}`, 'Descreva o serviço', [{ id: 'txt', label: 'O que você precisa?', longo: true, max: 600 }]));
    D.proxima(p); return vai();
  }
  if (acao === 'mo') { p.r.outros = interaction.fields.getTextInputValue('txt').trim(); D.proxima(p); return vai(); }
  if (acao === 'pz') {
    p.r.prazo = interaction.values[0];
    if (p.r.prazo === 'outro') return interaction.showModal(modal(`fs:mp:${id}`, 'Qual é o prazo?', [{ id: 'txt', label: 'Prazo', dica: 'Ex.: até dia 30, ou 10 dias', max: 100 }]));
    D.proxima(p); return vai();
  }
  if (acao === 'mp') { p.r.prazoTexto = interaction.fields.getTextInputValue('txt').trim(); D.proxima(p); return vai(); }
  if (acao === 'tp') { p.r.tipo = interaction.values[0]; D.proxima(p); return vai(); }
  if (acao === 'yn') {
    if (!M.COLETA[a]) return saida(interaction, expirado());
    if (b === 'sim') { p.r[a] = 'sim'; p.coletando = a; p.anexos[a] = p.anexos[a] || { arquivos: [], textos: [] }; return vai(); }
    p.r[a] = 'nao'; p.coletando = null; delete p.anexos[a]; D.proxima(p); return vai();
  }
  if (acao === 'pr') { p.coletando = null; D.proxima(p); return vai(); }
  if (acao === 'env') {
    if (D.faltando(p).length) return vai('Faltam respostas. Recomece o pedido.');
    p.status = 'enviado'; p.enviadoEm = Date.now(); p.nome = interaction.user.globalName || interaction.user.username; D.salvar(p);
    await require('./dono').notificar(client, p);
    return saida(interaction, fim('Pedido enviado. Você será avisado aqui, por mensagem privada, quando houver uma resposta.'));
  }
  return undefined;
}

module.exports = { intro, tela, tratar, modal, btn, linha, fim };
