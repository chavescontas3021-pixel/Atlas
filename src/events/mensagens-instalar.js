const M = require('../mensagens/nucleo');

// Instala os ganchos assim que o arquivo é carregado (antes do bot enviar qualquer coisa)
try {
  M.instalar();
} catch (e) {
  console.error('[Mensagens] não consegui instalar:', e);
}

module.exports = {
  name: 'clientReady',
  once: true,
  execute() {
    try {
      console.log(`[Mensagens] ${M.catalogo().lista.length} mensagens catalogadas, ${Object.keys(M.edicoes()).length} editadas`);
    } catch (e) {
      console.error('[Mensagens]', e);
    }
  },
};
