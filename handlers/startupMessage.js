// handlers/startupMessage.js
const db = require('../db.js'); // Adjust if your path is different


module.exports = async function sendStartupMessage(client, guildId, db) {
  try {
    const [rows] = await db.query('SELECT status_channel_id FROM guild_config WHERE guild_id = ?', [guildId]);

    if (!rows.length || !rows[0].status_channel_id) {
      console.log(`No status_channel_id set in DB for guild ${guildId}.`);
      return;
    }

    const channelId = rows[0].status_channel_id;
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (channel) {
      await channel.send('✅ Bot is now online and ready!');
      console.log(`Startup message sent to guild ${guildId}.`);
    } else {
      console.log(`Channel ${channelId} not found for guild ${guildId}.`);
    }
  } catch (err) {
    console.error(`Error sending startup message to guild ${guildId}:`, err);
  }
};