const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('department')
    .setDescription('Manage departments')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a department')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Full department name').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('abbreviation').setDescription('Short abbreviation').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('ranks').setDescription('Comma-separated list of ranks').setRequired(true)
        )
        .addRoleOption(opt =>
          opt.setName('hire_role').setDescription('Role assigned to hired applicants').setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub.setName('edit')
        .setDescription('Edit a department')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Department name to edit').setRequired(true).setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt.setName('field')
            .setDescription('Field to edit')
            .addChoices(
              { name: 'department_name', value: 'department_name' },
              { name: 'abbreviation', value: 'abbreviation' },
              { name: 'ranks', value: 'ranks' },
              { name: 'hire_role_id', value: 'hire_role_id' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('value').setDescription('New value or mention role if editing hire_role_id').setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a department')
        .addStringOption(opt =>
          opt.setName('name').setDescription('Department name to remove').setRequired(true).setAutocomplete(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View all departments')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const name = interaction.options.getString('name');
      const abbreviation = interaction.options.getString('abbreviation');
      const ranks = interaction.options.getString('ranks');
      const hireRole = interaction.options.getRole('hire_role');
      const hireRoleId = hireRole?.id || null;

      await db.query(
        'INSERT INTO guild_departments (guild_id, department_name, abbreviation, ranks, hire_role_id) VALUES (?, ?, ?, ?, ?)',
        [guildId, name, abbreviation, ranks, hireRoleId]
      );

      return interaction.reply({ content: `✅ Department \`${name}\` added.`, flags: 1 << 6 });
    }

    if (sub === 'edit') {
      const name = interaction.options.getString('name');
      const field = interaction.options.getString('field');
      let value = interaction.options.getString('value');

      if (field === 'hire_role_id') {
        const match = value.match(/^<@&(\d+)>$/);
        value = match ? match[1] : value;
        if (!interaction.guild.roles.cache.has(value)) {
          return interaction.reply({ content: '❌ That role is not valid in this server.', flags: 1 << 6 });
        }
      }

      const allowedFields = ['department_name', 'abbreviation', 'ranks', 'hire_role_id'];
      if (!allowedFields.includes(field)) {
        return interaction.reply({ content: '❌ Invalid field.', flags: 1 << 6 });
      }

      await db.query(
        `UPDATE guild_departments SET \`${field}\` = ? WHERE guild_id = ? AND department_name = ?`,
        [value, guildId, name]
      );

      return interaction.reply({ content: `✅ \`${field}\` updated for department \`${name}\`.`, flags: 1 << 6 });
    }

    if (sub === 'remove') {
      const name = interaction.options.getString('name');

      const [rows] = await db.query(
        'SELECT * FROM guild_departments WHERE guild_id = ? AND department_name = ?',
        [guildId, name]
      );

      if (rows.length === 0) {
        return interaction.reply({ content: '❌ Department not found.', flags: 1 << 6 });
      }

      await db.query(
        'DELETE FROM guild_departments WHERE guild_id = ? AND department_name = ?',
        [guildId, name]
      );

      return interaction.reply({ content: `✅ Department \`${name}\` removed.`, flags: 1 << 6 });
    }

    if (sub === 'view') {
      const [rows] = await db.query(
        'SELECT department_name, abbreviation, ranks, hire_role_id FROM guild_departments WHERE guild_id = ?',
        [guildId]
      );

      if (rows.length === 0) {
        return interaction.reply({ content: 'ℹ️ No departments found.', flags: 1 << 6 });
      }

      const embed = new EmbedBuilder()
        .setTitle('📁 Departments')
        .setColor(0x3498db)
        .setDescription(
          rows.map(r => {
            const role = interaction.guild.roles.cache.get(r.hire_role_id);
            const roleMention = role ? role.toString() : 'None';
            return `**${r.department_name}** (\`${r.abbreviation}\`)\nHire Role: ${roleMention}\nRanks: \`${r.ranks || 'None'}\``;
          }).join('\n\n')
        );

      return interaction.reply({ embeds: [embed], flags: 1 << 6 });
    }
  },

  async autocomplete(interaction) {
    const sub = interaction.options.getSubcommand();
    const focused = interaction.options.getFocused();
    const guildId = interaction.guild.id;

    if (['edit', 'remove'].includes(sub)) {
      const [rows] = await db.query(
        'SELECT department_name FROM guild_departments WHERE guild_id = ?',
        [guildId]
      );

      const choices = rows
        .map(r => r.department_name)
        .filter(name => name.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25)
        .map(name => ({ name, value: name }));

      await interaction.respond(choices);
    }
  }
};
