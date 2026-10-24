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

const comandos = [];
for (const arquivo of listarArquivos(path.join(__dirname, 'commands'))) {
  const comando = require(arquivo);
  if (comando.data && comando.execute) {
    comandos.push(comando.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Registrando ${comandos.length} comando(s)...`);
    // Com GUILD_ID os comandos aparecem na hora, só no seu servidor
    const rota = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
      : Routes.applicationCommands(process.env.CLIENT_ID);
    await rest.put(rota, { body: comandos });
    console.log('Comandos registrados com sucesso!');
  } catch (erro) {
    console.error(erro);
  }
})();
