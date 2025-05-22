// handlers/shutdownMessage.js
const fs = require('fs');
const path = require('path');

module.exports = async function sendShutdownMessage(client, guildId, guildName) {
  try {
    const configPath = path.join(__dirname, '..', 'commands', 'configs', `${guildId}.json`);
    if (!fs.existsSync(configPath)) {
      console.log(`No shutdown config found for guild ${guildId}.`);
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const channel = await client.channels.fetch(config.statusChannel);
    if (channel) {
      await channel.send(`❌ Bot shutting down in ${guildName}. See you soon.`);
      console.log(`Shutdown message sent to ${guildId}.`);
    } else {
      console.log(`Channel not found for guild ${guildId}.`);
    }
  } catch (err) {
    console.error(`Error sending shutdown message to guild ${guildId}:`, err);
  }
};
