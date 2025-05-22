// events/interactionCreate.js
module.exports = async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
  
      if (!command) {
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        return;
      }
  
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: '❌ There was an error executing this command.', ephemeral: true });
        } else {
          await interaction.reply({ content: '❌ There was an error executing this command.', ephemeral: true });
        }
      }
    }
  
    if (interaction.isButton()) {
      const eventCommand = interaction.client.commands.get('event');
      if (eventCommand && typeof eventCommand.handleButtonInteraction === 'function') {
        try {
          await eventCommand.handleButtonInteraction(interaction);
        } catch (error) {
          console.error('Error handling button interaction:', error);
          await interaction.reply({ content: '❌ Button interaction failed.', ephemeral: true });
        }
      }
    }
  
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error('Error in autocomplete interaction:', error);
        }
      }
    }
  };
  