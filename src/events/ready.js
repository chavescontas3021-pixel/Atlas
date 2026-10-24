const { ActivityType } = require('discord.js');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Atlas online como ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: 'a house', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
