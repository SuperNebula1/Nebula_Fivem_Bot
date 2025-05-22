// handlers/startupMessage.js
const fs = require('fs');
const path = require('path');

module.exports = async function sendStartupMessage(client, guildId) {
  try {
    const configPath = path.join(__dirname, '..', 'configs', `${guildId}.json`);
    if (!fs.existsSync(configPath)) {
      console.log(`No startup config found for guild ${guildId}.`);
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const channel = await client.channels.fetch(config.statusChannel);
    if (channel) {
      await channel.send('✅ Bot is now online and ready!');
      console.log(`Startup message sent to ${guildId}.`);
    } else {
      console.log(`Channel not found for guild ${guildId}.`);
    }
  } catch (err) {
    console.error(`Error sending startup message to guild ${guildId}:`, err);
  }
};
