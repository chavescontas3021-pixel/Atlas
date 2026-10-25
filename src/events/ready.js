const { ActivityType } = require('discord.js');

// ===== MUDE AQUI =====
const TEXTO = '➺     𓈒     ❛      ╱      𝅙ִ𝅙𝐂uidando 𝐞 𝐩rotegendo 𝐚 𝐖ahid 𝐕alley 𝅙ִ𝅙     Ი౧';
const TIPO = ActivityType.Custom;
const STATUS = 'online';
// =====================

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Atlas online como ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'Atlas', state: TEXTO, type: TIPO }],
      status: STATUS,
    });
  },
};
