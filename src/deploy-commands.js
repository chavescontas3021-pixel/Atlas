require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

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

// Comandos normais (só no servidor) e comandos globais (também funcionam no privado, ex.: /parceriaficha)
const doServidor = [];
const globais = [];
for (const arquivo of listarArquivos(path.join(__dirname, 'commands'))) {
  const comando = require(arquivo);
  if (comando.data && comando.execute) {
    (comando.global ? globais : doServidor).push(comando.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    if (process.env.GUILD_ID) {
      // Com GUILD_ID os comandos normais aparecem na hora, só no seu servidor
      console.log(`Registrando ${doServidor.length} comando(s) no servidor...`);
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
        body: doServidor,
      });
      console.log(`Registrando ${globais.length} comando(s) global(is)...`);
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: globais });
    } else {
      // Sem GUILD_ID tudo vira global; os normais ficam limitados ao servidor (contexts: [0])
      const todos = [...globais, ...doServidor.map((c) => ({ ...c, contexts: [0] }))];
      console.log(`Registrando ${todos.length} comando(s)...`);
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: todos });
    }
    console.log('Comandos registrados com sucesso!');
  } catch (erro) {
    console.error(erro);
  }
})();
