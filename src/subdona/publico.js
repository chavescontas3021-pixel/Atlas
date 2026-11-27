const { MessageFlags } = require('discord.js');

const EPH = Number(MessageFlags.Ephemeral);

function limpar(opcoes) {
  if (!opcoes || typeof opcoes !== 'object' || Array.isArray(opcoes)) return opcoes;
  const o = { ...opcoes };
  if (typeof o.flags === 'number') { const f = o.flags & ~EPH; if (f) o.flags = f; else delete o.flags; }
  delete o.ephemeral;
  return o;
}

function aplicar(interaction) {
  if (!interaction || interaction.__publico) return interaction;
  interaction.__publico = true;
  for (const m of ['reply', 'deferReply', 'followUp']) {
    if (typeof interaction[m] !== 'function') continue;
    const original = interaction[m].bind(interaction);
    interaction[m] = (o) => original(limpar(o));
  }
  return interaction;
}

module.exports = { aplicar, limpar };
