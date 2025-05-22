// commands/server-config.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../db'); // adjust path based on your project

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-config')
    .setDescription('Update the server config')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a config value')
        .addStringOption(opt =>
          opt.setName('key').setDescription('Config key').setRequired(true)
            .addChoices(
              { name: 'log_channel_id', value: 'log_channel_id' },
              { name: 'welcome_channel_id', value: 'welcome_channel_id' },
              { name: 'status_channel_id', value: 'status_channel_id' },
              { name: 'prefix', value: 'prefix' }
            )
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('Value to set').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription("View this server's config")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'set') {
      const key = interaction.options.getString('key');
      const value = interaction.options.getString('value');

      try {
        await db.query(
          `INSERT INTO guild_config (guild_id, \`${key}\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`${key}\` = VALUES(\`${key}\`)`,
          [guildId, value]
        );
        await interaction.reply({ content: `✅ Updated \`${key}\` to \`${value}\`.`, ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ Failed to update config.', ephemeral: true });
      }
    }

    if (sub === 'view') {
      try {
        const [rows] = await db.query('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
        if (rows.length === 0) {
          return interaction.reply({ content: 'ℹ️ No config found for this server.', ephemeral: true });
        }

        const config = rows[0];
        const configText = Object.entries(config).map(([key, val]) => `**${key}**: ${val || 'Not set'}`).join('\n');

        await interaction.reply({ content: `🛠 Server Config:\n\n${configText}`, ephemeral: true });
      } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ Failed to retrieve config.', ephemeral: true });
      }
    }
  }
};
