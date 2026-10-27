require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    // Usados pelos logs do servidor
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildExpressions || GatewayIntentBits.GuildEmojisAndStickers,
  ].filter(Boolean),
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

client.commands = new Collection();

// Lê todos os .js de uma pasta, incluindo subpastas
function listarArquivos(dir) {
  let resultado = [];
  if (!fs.existsSync(dir)) return resultado;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) {
      resultado = resultado.concat(listarArquivos(caminho));
    } else if (item.name.endsWith('.js')) {
      resultado.push(caminho);
    }
  }
  return resultado;
}

// Carrega comandos
for (const arquivo of listarArquivos(path.join(__dirname, 'commands'))) {
  const comando = require(arquivo);
  if (comando.data && comando.execute) {
    client.commands.set(comando.data.name, comando);
  } else {
    console.warn(`[AVISO] Comando inválido: ${arquivo}`);
  }
}

// Carrega eventos (várias partes podem usar o mesmo evento)
for (const arquivo of listarArquivos(path.join(__dirname, 'events'))) {
  const evento = require(arquivo);
  if (!evento.name || !evento.execute) continue;
  if (evento.once) {
    client.once(evento.name, (...args) => evento.execute(client, ...args));
  } else {
    client.on(evento.name, (...args) => evento.execute(client, ...args));
  }
}

process.on('unhandledRejection', (erro) => {
  console.error('[ERRO NÃO TRATADO]', erro);
});

// Servidor mínimo: alguns hospedadores gratuitos exigem uma porta aberta
if (process.env.PORT) {
  http
    .createServer((req, res) => {
      res.writeHead(200);
      res.end('Atlas online');
    })
    .listen(process.env.PORT);
}

client.login(process.env.TOKEN);
