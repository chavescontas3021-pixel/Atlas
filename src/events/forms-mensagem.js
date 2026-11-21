// Formulário de servidor: guarda, na DM, o que o cliente envia enquanto uma pergunta pede arquivos ou texto
const D = require('../formsrv/dados');
const F = require('../formsrv/fluxo');

const MAX_ARQ = 10, MAX_TXT = 8000;
module.exports = {
  name: 'messageCreate',
  async execute(client, msg) {
    try {
      if (msg.guild || msg.author.bot) return;
      const p = D.coletandoDe(msg.author.id);
      if (!p) return;
      const a = (p.anexos[p.coletando] = p.anexos[p.coletando] || { arquivos: [], textos: [] });
      let guardou = false;
      for (const f of msg.attachments.values()) {
        if (a.arquivos.length >= MAX_ARQ) break;
        const ehTxt = p.coletando === 'lista' && /\.txt$/i.test(f.name || '') && f.size <= 200000;
        if (ehTxt) { try { a.textos.push((await (await fetch(f.url)).text()).slice(0, MAX_TXT)); guardou = true; continue; } catch { /* guarda como arquivo */ } }
        a.arquivos.push({ nome: f.name || 'arquivo', url: f.url, tam: f.size || 0 }); guardou = true;
      }
      const t = (msg.content || '').trim();
      if (t && a.textos.join('\n').length < MAX_TXT) { a.textos.push(t.slice(0, 4000)); guardou = true; }
      if (!guardou) return;
      D.salvar(p);
      msg.react('📥').catch(() => {});
    } catch (e) { console.error('[Forms] mensagem:', e); }
  },
};
