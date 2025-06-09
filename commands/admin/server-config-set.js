const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server-config-set')
    .setDescription('Set server config values')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Set a config value that expects a channel')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('Which setting to update')
            .addChoices(
              { name: 'log_channel_id', value: 'log_channel_id' },
              { name: 'welcome_channel_id', value: 'welcome_channel_id' },
              { name: 'status_channel_id', value: 'status_channel_id' },
              { name: 'suggestion_channel_id', value: 'suggestion_channel_id' },
              { name: 'ticket_log_channel', value: 'ticket_log_channel' },
              { name: 'department_announcement_channel', value: 'department_announcement_channel' },
              { name: 'announcement_channel', value: 'announcement_channel' },
              { name: 'voting_channel', value: 'voting_channel' },
              { name: 'change_log_channel', value: 'change_log_channel' },
              { name: 'bugs_channel', value: 'bugs_channel' },
              { name: 'ticket_creation_channel', value: 'ticket_creation_channel' }
            )
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel to assign').setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('role')
        .setDescription('Set a config value that expects a role')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('Config key')
            .addChoices(
              { name: 'staff_role', value: 'staff_role' },
              { name: 'default_role', value: 'default_role' }
            )
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role to assign').setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('prefix')
        .setDescription('Set the command prefix')
        .addStringOption(opt =>
          opt.setName('value').setDescription('New prefix').setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('category')
        .setDescription('Set a config value that expects a category channel')
        .addStringOption(opt =>
          opt.setName('key')
            .setDescription('Which setting to update')
            .addChoices({ name: 'ticket_category_id', value: 'ticket_category_id' })
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('category').setDescription('Category to assign').addChannelTypes(ChannelType.GuildCategory).setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('welcome-toggle')
        .setDescription('Enable or disable welcome messages')
        .addBooleanOption(opt =>
          opt.setName('enabled').setDescription('Turn welcomes on or off').setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('welcome-message')
        .setDescription('Set a custom welcome message')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('Message content (use {user} and {server} as placeholders)')
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('timezone')
        .setDescription("Set the server's time zone")
        .addStringOption(opt =>
          opt.setName('value')
            .setDescription('IANA time zone (e.g., America/New_York)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'channel') {
      const key = interaction.options.getString('key');
      const channel = interaction.options.getChannel('channel');
      await db.query(
        `INSERT INTO guild_config (guild_id, \`${key}\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`${key}\` = VALUES(\`${key}\`)`,
        [guildId, channel.id]
      );
      return interaction.reply({ content: `✅ \`${key}\` set to <#${channel.id}>.`, ephemeral: true });
    }

    if (sub === 'category') {
      const key = interaction.options.getString('key');
      const category = interaction.options.getChannel('category');

      if (category.type !== ChannelType.GuildCategory) {
        return interaction.reply({ content: '❌ That is not a valid category channel.', ephemeral: true });
      }

      await db.query(
        `INSERT INTO guild_config (guild_id, \`${key}\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`${key}\` = VALUES(\`${key}\`)`,
        [guildId, category.id]
      );

      return interaction.reply({ content: `✅ \`${key}\` set to \`${category.name}\`.`, ephemeral: true });
    }

    if (sub === 'role') {
      const key = interaction.options.getString('key');
      const role = interaction.options.getRole('role');
      await db.query(
        `INSERT INTO guild_config (guild_id, \`${key}\`) VALUES (?, ?) ON DUPLICATE KEY UPDATE \`${key}\` = VALUES(\`${key}\`)`,
        [guildId, role.id]
      );
      return interaction.reply({ content: `✅ \`${key}\` set to <@&${role.id}>.`, ephemeral: true });
    }

    if (sub === 'prefix') {
      const value = interaction.options.getString('value');
      await db.query(
        'INSERT INTO guild_config (guild_id, prefix) VALUES (?, ?) ON DUPLICATE KEY UPDATE prefix = VALUES(prefix)',
        [guildId, value]
      );
      return interaction.reply({ content: `✅ Prefix set to \`${value}\`.`, ephemeral: true });
    }

    if (sub === 'default-role') {
      const role = interaction.options.getRole('role');
      await db.query(
        'INSERT INTO guild_config (guild_id, default_role) VALUES (?, ?) ON DUPLICATE KEY UPDATE default_role = VALUES(default_role)',
        [guildId, role.id]
      );
      return interaction.reply({ content: `✅ Default role set to <@&${role.id}>`, ephemeral: true });
    }

    if (sub === 'welcome-toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      await db.query(
        'INSERT INTO guild_config (guild_id, welcome_enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE welcome_enabled = VALUES(welcome_enabled)',
        [guildId, enabled]
      );
      return interaction.reply({ content: `✅ Welcome messages have been ${enabled ? 'enabled' : 'disabled'}.`, ephemeral: true });
    }

    if (sub === 'welcome-message') {
      const message = interaction.options.getString('message');
      await db.query(
        'INSERT INTO guild_config (guild_id, welcome_message) VALUES (?, ?) ON DUPLICATE KEY UPDATE welcome_message = VALUES(welcome_message)',
        [guildId, message]
      );
      return interaction.reply({ content: '✅ Welcome message updated.', ephemeral: true });
    }

    if (sub === 'timezone') {
      const value = interaction.options.getString('value');
      await db.query(
        'INSERT INTO guild_config (guild_id, timezone) VALUES (?, ?) ON DUPLICATE KEY UPDATE timezone = VALUES(timezone)',
        [guildId, value]
      );
      return interaction.reply({ content: `✅ Time zone set to \`${value}\`.`, ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused();
    const key = interaction.options.getString('key');

    let choices = [];

    if (sub === 'channel' && [
      'log_channel_id', 'welcome_channel_id', 'status_channel_id', 'suggestion_channel_id',
      'ticket_log_channel', 'department_announcement_channel', 'announcement_channel',
      'voting_channel', 'change_log_channel', 'bugs_channel', 'ticket_creation_channel'
    ].includes(key)) {
      choices = interaction.guild.channels.cache
        .filter(c => c.type === ChannelType.GuildText)
        .map(c => ({ name: `#${c.name}`, value: c.id }));
    } else if (sub === 'role' && key === 'staff_role') {
      choices = interaction.guild.roles.cache
        .map(r => ({ name: r.name, value: r.id }));
    } else if (sub === 'prefix') {
      choices = ['!', '.', '?', '-', '*'].map(p => ({ name: `Prefix: ${p}`, value: p }));
    }

    const filtered = choices
      .filter(choice => choice.name.toLowerCase().includes(focused.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(filtered);
  }
};
