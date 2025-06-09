// handlers/deployCommands.js
const { REST, Routes, Guild } = require('discord.js');
const db = require('../db');
const { CLIENT_ID } = process.env;

module.exports = async (client) => {
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  const commandDataMap = new Map();

  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const [rows] = await db.query('SELECT disabled_commands FROM guild_config WHERE guild_id = ?', [guildId]);
      const disabled = rows.length > 0 ? JSON.parse(rows[0].disabled_commands || '[]') : [];

      const enabledCommands = [...client.commands.values()].filter(cmd => !disabled.includes(cmd.data.name));
      const commandData = enabledCommands.map(cmd => cmd.data.toJSON());

      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: [] });
      console.log(`${guild.name} - [DEPLOY] Registering for ${guildId}:/n`, commandData.map(c => c.name));

      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commandData }
      );

      

      console.log(`✅ Registered ${commandData.length} commands for guild ${guildId}`);
    } catch (error) {
      console.error(`❌ Failed to register commands for guild ${guildId}:`, error);
    }
  }
};
