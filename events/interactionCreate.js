const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');

module.exports = async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({ content: 'Unknown command.', flags: 64 });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing command ${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ There was an error executing this command.', flags: 64 });
      } else {
        await interaction.reply({ content: '❌ There was an error executing this command.', flags: 64 });
      }
    }
  }

  if (interaction.isButton()) {
    const eventCommand = interaction.client.commands.get('event');
    const announceCommand = interaction.client.commands.get('announce');

    try {
      if (eventCommand?.handleButtonInteraction && interaction.customId.startsWith('event_')) {
        await eventCommand.handleButtonInteraction(interaction);
      } else if (announceCommand?.handleButtonInteraction) {
        await announceCommand.handleButtonInteraction(interaction);
      } else if (interaction.customId === 'changelog_adds') {
        const modal = new ModalBuilder()
          .setCustomId('changelog_modal_add')
          .setTitle('Add Changelog Entry');

        const statusInput = new TextInputBuilder()
          .setCustomId('status')
          .setLabel('Status (e.g., Added, Changed)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const descInput = new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(statusInput),
          new ActionRowBuilder().addComponents(descInput)
        );

        await interaction.showModal(modal);
      } else if (interaction.customId === 'changelog_edits' || interaction.customId === 'changelog_deletes') {
        const [rows] = await db.query('SELECT * FROM tblchangelogs ORDER BY changeTimestamp DESC');

        if (!rows.length) {
          return interaction.reply({ content: '❌ No changelog entries to choose from.', flags: 64 });
        }

        const options = rows.map(row => ({
          label: row.changeDescription.slice(0, 100),
          value: row.changePK.toString()
        }));

        const select = new StringSelectMenuBuilder()
          .setCustomId(`changelog_select_${interaction.customId.split('_')[1]}`)
          .setPlaceholder(`Select an entry to ${interaction.customId.split('_')[1]}`)
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.reply({ content: 'Select an entry:', components: [row], flags: 64 });
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      await interaction.reply({ content: '❌ Button interaction failed.', flags: 64 });
    }
  }

  if (interaction.isModalSubmit()) {
    const announceCommand = interaction.client.commands.get('announce');
    try {
      if (announceCommand?.handleModalSubmit) {
        await announceCommand.handleModalSubmit(interaction);
      }

      if (interaction.customId.startsWith('changelog_modal_')) {
        const parts = interaction.customId.split('_');
        const action = parts[2];
        const changePK = parts[3] ? parseInt(parts[3]) : null;

        const status = interaction.fields.getTextInputValue('status');
        const description = interaction.fields.getTextInputValue('description');
        const timestamp = new Date();

        try {
          if (action === 'add') {
            await db.query(
              'INSERT INTO tblchangelogs (changeStatus, changeDescription, changeTimestamp) VALUES (?, ?, ?)',
              [status, description, timestamp]
            );
            await interaction.reply({ content: '✅ Changelog entry added.', flags: 64 });

          } else if (action === 'edit' && changePK) {
            await db.query(
              'UPDATE tblchangelogs SET changeStatus = ?, changeDescription = ?, changeTimestamp = ? WHERE changePK = ?',
              [status, description, timestamp, changePK]
            );
            await interaction.reply({ content: '✅ Changelog entry updated.', flags: 64 });
          }

        } catch (err) {
          console.error('Error handling changelog modal:', err);
          await interaction.reply({ content: '❌ Failed to process changelog.', flags: 64 });
        }
      }

    } catch (error) {
      console.error('Error handling modal submit:', error);
      await interaction.reply({ content: '❌ Modal submit failed.', flags: 64 });
    }
  }

  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error('Error in autocomplete interaction:', error);
      }
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('changelog_select_')) {
    const action = interaction.customId.split('_')[2];
    const selectedPK = parseInt(interaction.values[0]);

    try {
      const [[entry]] = await db.query('SELECT * FROM tblchangelogs WHERE changePK = ?', [selectedPK]);

      if (!entry) {
        return interaction.reply({ content: '❌ Changelog entry not found.', flags: 64 });
      }

      if (action === 'delete') {
        await db.query('DELETE FROM tblchangelogs WHERE changePK = ?', [selectedPK]);
        return interaction.update({ content: '🗑️ Entry deleted.', components: [] });
      }

      if (action === 'edit') {
        const modal = new ModalBuilder()
          .setCustomId(`changelog_modal_edit_${selectedPK}`)
          .setTitle('Edit Changelog Entry');

        const statusInput = new TextInputBuilder()
          .setCustomId('status')
          .setLabel('Status')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(entry.changeStatus);

        const descInput = new TextInputBuilder()
          .setCustomId('description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setValue(entry.changeDescription);

        modal.addComponents(
          new ActionRowBuilder().addComponents(statusInput),
          new ActionRowBuilder().addComponents(descInput)
        );

        await interaction.showModal(modal);
      }
    } catch (err) {
      console.error('Error handling select menu:', err);
      await interaction.reply({ content: '❌ Failed to process selection.', flags: 64 });
    }
  }
};