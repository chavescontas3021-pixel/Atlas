const N = require('../noturno/nucleo');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    N.iniciar(client);
  },
};
