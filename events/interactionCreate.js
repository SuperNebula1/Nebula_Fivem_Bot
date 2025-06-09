const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
const db = require('../db');

// Helper to respond without throwing reply errors
async function safeReply(interaction, options) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp({ ...options, flags: MessageFlags.Ephemeral });
    } else {
      return await interaction.reply({ ...options, flags: MessageFlags.Ephemeral });
    }
  } catch (err) {
    console.error('safeReply failed:', err);
  }
}

module.exports = async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return safeReply(interaction, { content: 'Unknown command.' });

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Command error (${interaction.commandName}):`, error);
      return safeReply(interaction, { content: '❌ Command execution failed.' });
    }
  }

  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId === 'changelog_adds') {
      const modal = new ModalBuilder()
        .setCustomId('changelog_modal_add')
        .setTitle('Add Changelog Entry')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('status')
              .setLabel('Status (e.g., Added)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

      return await interaction.showModal(modal);
    }

    if (customId === 'changelog_edits' || customId === 'changelog_deletes') {
      const [rows] = await db.query('SELECT * FROM tblchangelogs ORDER BY changeTimestamp DESC');
      if (!rows.length) return safeReply(interaction, { content: '❌ No changelog entries available.' });

      const action = customId.split('_')[1]; // edits or deletes
      const select = new StringSelectMenuBuilder()
        .setCustomId(`changelog_select_${action}`)
        .setPlaceholder(`Select entry to ${action.slice(0, -1)}`)
        .addOptions(rows.map(row => ({
          label: row.changeDescription.slice(0, 100),
          value: row.changePK.toString()
        })));

      return await interaction.reply({
        content: `Choose a changelog entry to ${action.slice(0, -1)}:`,
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral
      });
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('changelog_select_')) {
    const action = interaction.customId.split('_')[2]; // 'edit' or 'delete'
    const selectedPK = parseInt(interaction.values[0]);

    const [[entry]] = await db.query('SELECT * FROM tblchangelogs WHERE changePK = ?', [selectedPK]);
    if (!entry) return safeReply(interaction, { content: '❌ Entry not found.' });

    if (action === 'delete') {
      await db.query('DELETE FROM tblchangelogs WHERE changePK = ?', [selectedPK]);
      return await interaction.update({ content: '🗑️ Entry deleted.', components: [] });
    }

    if (action === 'edit') {
      const modal = new ModalBuilder()
        .setCustomId(`changelog_modal_edit_${selectedPK}`)
        .setTitle('Edit Changelog Entry')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('status')
              .setLabel('Status')
              .setStyle(TextInputStyle.Short)
              .setValue(entry.changeStatus)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('description')
              .setLabel('Description')
              .setStyle(TextInputStyle.Paragraph)
              .setValue(entry.changeDescription)
              .setRequired(true)
          )
        );

      return await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    const [_, __, action, pk] = interaction.customId.split('_'); // [changelog, modal, action, pk?]
    const status = interaction.fields.getTextInputValue('status');
    const description = interaction.fields.getTextInputValue('description');
    const timestamp = new Date();

    try {
      if (action === 'add') {
        await db.query(
          'INSERT INTO tblchangelogs (changeStatus, changeDescription, changeTimestamp) VALUES (?, ?, ?)',
          [status, description, timestamp]
        );
        return safeReply(interaction, { content: '✅ Entry added.' });
      }

      if (action === 'edit' && pk) {
        await db.query(
          'UPDATE tblchangelogs SET changeStatus = ?, changeDescription = ?, changeTimestamp = ? WHERE changePK = ?',
          [status, description, timestamp, parseInt(pk)]
        );
        return safeReply(interaction, { content: '✅ Entry updated.' });
      }
    } catch (err) {
      console.error('Modal processing failed:', err);
      return safeReply(interaction, { content: '❌ Could not process changelog.' });
    }
  }

  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }
  }
};
