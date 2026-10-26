const { EmbedBuilder, MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const R = require('../rpg/nucleo');
const S = require('../extras/stars');

const EPH = MessageFlags.Ephemeral;
const COR = 0xf5a3c7;
const NIVEL_MAX = 20;
const CD_MIN = 30;
const CUSTO_TROCA = 200;

const PROFISSOES = {
  mineiro: { emoji: '⛏️', nome: 'Mineiro', frase: 'cavou nas profundezas', mat: { id: 'minerio', nome: 'Minério', emoji: '🪨', preco: 12 } },
  pescador: { emoji: '🎣', nome: 'Pescador', frase: 'pescou no lago', mat: { id: 'peixe', nome: 'Peixe', emoji: '🐟', preco: 10 } },
  herbalista: { emoji: '🌿', nome: 'Herbalista', frase: 'colheu na floresta', mat: { id: 'erva', nome: 'Erva rara', emoji: '🌱', preco: 14 } },
  cacador: { emoji: '🏹', nome: 'Caçador', frase: 'caçou nas matas', mat: { id: 'couro', nome: 'Couro', emoji: '🦌', preco: 13 } },
};
const MATERIAIS = Object.values(PROFISSOES).map((p) => p.mat);

const caminho = (uid) => `extras.profissao.${uid}`;
const obter = (uid) => db.get(caminho(uid), null);
const xpNecessario = (n) => 30 + n * 25;
const sorteio = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const fmtMs = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
};

function dadosDe(d, prof) {
  if (!d.niveis[prof]) d.niveis[prof] = { nivel: 1, xp: 0 };
  return d.niveis[prof];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profissao')
    .setDescription('Trabalhe e ganhe stars e materiais')
    .addSubcommand((s) => s.setName('escolher').setDescription('Escolhe (ou troca) sua profissão')
      .addStringOption((o) => o.setName('profissao').setDescription('Qual').setRequired(true)
        .addChoices(...Object.entries(PROFISSOES).map(([id, p]) => ({ name: `${p.emoji} ${p.nome}`, value: id })))))
    .addSubcommand((s) => s.setName('trabalhar').setDescription(`Trabalha na sua profissão (a cada ${CD_MIN} minutos)`))
    .addSubcommand((s) => s.setName('status').setDescription('Mostra sua profissão e materiais')
      .addUserOption((o) => o.setName('membro').setDescription('De quem (padrão: você)')))
    .addSubcommand((s) => s.setName('vender').setDescription('Vende todos os seus materiais por stars')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;
    const responder = (content) => interaction.reply({ content, flags: EPH });
    const d = obter(uid);

    if (sub === 'status') {
      const alvo = interaction.options.getUser('membro') || interaction.user;
      const x = obter(alvo.id);
      if (!x || !x.atual) return responder(alvo.id === uid ? 'Você ainda não tem profissão. Use `/profissao escolher`.' : 'Essa pessoa ainda não tem profissão.');
      const p = PROFISSOES[x.atual];
      const nv = dadosDe(x, x.atual);
      const mats = MATERIAIS.filter((m) => (x.mats[m.id] || 0) > 0).map((m) => `${m.emoji} ${m.nome}: **${x.mats[m.id]}**`).join('\n') || 'nenhum';
      const emb = new EmbedBuilder().setColor(COR).setTitle(`${p.emoji} ${p.nome} — ${alvo.username}`).addFields(
        { name: 'Nível', value: `${nv.nivel}${nv.nivel >= NIVEL_MAX ? ' (máx.)' : ` — ${R.barra(nv.xp, xpNecessario(nv.nivel), 10)} ${nv.xp}/${xpNecessario(nv.nivel)}`}` },
        { name: 'Materiais', value: mats },
        { name: 'Trabalhos feitos', value: `${x.trabalhos || 0}`, inline: true },
      );
      return interaction.reply({ embeds: [emb] });
    }

    if (sub === 'escolher') {
      const id = interaction.options.getString('profissao');
      if (!R.obter(uid)) return responder(S.SEM_RPG);
      const novo = d || { atual: null, niveis: {}, mats: {}, cd: 0, trabalhos: 0 };
      if (novo.atual === id) return responder('Você já é essa profissão. 😉');
      let custo = 0;
      if (novo.atual) {
        custo = CUSTO_TROCA;
        const r = S.gastar(uid, custo);
        if (r.erro) return responder(`❌ Trocar de profissão custa ⭐ ${CUSTO_TROCA}. ${r.erro}`);
      }
      novo.atual = id;
      dadosDe(novo, id); // mantém o nível que você já tinha nela
      db.set(caminho(uid), novo);
      const p = PROFISSOES[id];
      return interaction.reply(`${p.emoji} Agora você é **${p.nome}**!${custo ? ` (⭐ -${custo})` : ''} Use \`/profissao trabalhar\`.`);
    }

    if (!d || !d.atual) return responder('Você ainda não tem profissão. Use `/profissao escolher`.');
    const p = PROFISSOES[d.atual];
    const agora = Date.now();

    if (sub === 'trabalhar') {
      const falta = (d.cd || 0) - agora;
      if (falta > 0) return responder(`⏳ Você está descansando. Volte em ${fmtMs(falta)}.`);
      const j = R.obter(uid);
      if (!j) return responder(S.SEM_RPG);
      const nv = dadosDe(d, d.atual);
      const stars = Math.round(sorteio(10, 25) * (1 + (nv.nivel - 1) * 0.1));
      const qtd = 1 + sorteio(0, 1) + Math.floor(nv.nivel / 5);
      j.moedas += stars;
      R.salvar(uid, j);
      d.mats[p.mat.id] = (d.mats[p.mat.id] || 0) + qtd;
      d.cd = agora + CD_MIN * 60000;
      d.trabalhos = (d.trabalhos || 0) + 1;
      let subiu = 0;
      if (nv.nivel < NIVEL_MAX) {
        nv.xp += 12;
        while (nv.nivel < NIVEL_MAX && nv.xp >= xpNecessario(nv.nivel)) {
          nv.xp -= xpNecessario(nv.nivel);
          nv.nivel++;
          subiu++;
        }
      }
      db.set(caminho(uid), d);
      return interaction.reply(`${p.emoji} Você ${p.frase} e ganhou ⭐ **${stars}** stars e ${p.mat.emoji} **${qtd}x ${p.mat.nome}**!${subiu ? `\n🎉 Sua profissão subiu para o nível **${nv.nivel}**!` : ''}`);
    }

    if (sub === 'vender') {
      const nv = dadosDe(d, d.atual);
      let total = 0;
      const partes = [];
      for (const m of MATERIAIS) {
        const q = d.mats[m.id] || 0;
        if (!q) continue;
        total += Math.round(q * m.preco * (1 + (nv.nivel - 1) * 0.05));
        partes.push(`${q}x ${m.nome}`);
        d.mats[m.id] = 0;
      }
      if (!total) return responder('Você não tem materiais para vender. Use `/profissao trabalhar`.');
      const r = S.ganhar(uid, total);
      if (r.erro) return responder(`❌ ${r.erro}`);
      db.set(caminho(uid), d);
      return interaction.reply(`💰 Você vendeu ${partes.join(', ')} por ⭐ **${total}** stars!`);
    }
  },
};
