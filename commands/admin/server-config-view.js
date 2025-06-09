const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-config-view')
    .setDescription('View server config values')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const [rows] = await db.query(
      `SELECT 
          log_channel_id, welcome_channel_id, status_channel_id, staff_role, 
          default_role, welcome_enabled, prefix, suggestion_channel_id, 
          ticket_category_id, ticket_log_channel, department_announcement_channel, 
          announcement_channel, voting_channel, change_log_channel, 
          bugs_channel, ticket_creation_channel, timezone
        FROM guild_config WHERE guild_id = ?`,
        [guildId]
    );

      if (rows.length === 0) {
        return interaction.reply({ content: 'ℹ️ No config found for this server.', flags: 64 });
      }

      const config = rows[0];

      const fields = Object.entries(config).map(([key, val]) => {
        let value = 'Not set';
        if (val !== null && val !== undefined) {
          value =
            interaction.guild.channels.cache.has(val) ? `<#${val}>` :
            interaction.guild.roles.cache.has(val) ? `<@&${val}>` :
            typeof val === 'boolean' ? (val ? '✅ Enabled' : '❌ Disabled') :
            `\`${val}\``;
        }

        return { name: key, value, inline: true };
      });

      const embed = new EmbedBuilder()
        .setTitle('🛠 Server Configuration')
        .setDescription(`Server: **${interaction.guild.name}**\nID: \`${guildId}\``)
        .addFields(fields)
        .setColor(0x2ecc71);

      return interaction.reply({ embeds: [embed], flags: 64 });
  }
};
