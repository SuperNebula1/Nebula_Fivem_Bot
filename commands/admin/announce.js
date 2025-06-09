const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
  } = require('discord.js');
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('announce')
      .setDescription('Interactively build and send an announcement embed.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
    async execute(interaction) {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_title').setLabel('Set Title').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('set_description').setLabel('Set Description').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('set_color').setLabel('Set Color').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('preview_embed').setLabel('Preview').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('send_embed').setLabel('Send').setStyle(ButtonStyle.Danger)
      );
  
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('set_image').setLabel('Set Image').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_thumbnail').setLabel('Set Thumbnail').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('set_footer').setLabel('Set Footer').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('cancel_embed').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
      );
  
      interaction.client.embedSessions = interaction.client.embedSessions || {};
      interaction.client.embedSessions[interaction.user.id] = {
        embedData: {},
        channel: interaction.channel.id
      };
  
      await interaction.reply({
        content: '🧱 Embed Builder Started! Use the buttons below to build your embed:',
        components: [row1, row2],
        flags: MessageFlags.Ephemeral,
      });
    },
  
    handleButtonInteraction: async (interaction) => {
      const session = interaction.client.embedSessions?.[interaction.user.id];
      if (!session) return interaction.reply({ content: '⚠️ No active embed session found.', flags: MessageFlags.Ephemeral });
  
      const updateField = (key, value) => {
        session.embedData[key] = value;
      };
  
      const customId = interaction.customId;
  
      // Open a modal
      if (['set_title', 'set_description', 'set_color', 'set_image', 'set_thumbnail', 'set_footer'].includes(customId)) {
        const label = customId.replace('set_', '').replace(/^\w/, c => c.toUpperCase());
        const modal = new ModalBuilder()
          .setCustomId(`${customId}_modal`)
          .setTitle(`Set ${label}`);
  
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(`${customId}_input`)
              .setLabel(`Enter ${label}`)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
  
        return await interaction.showModal(modal);
      }
  
      // Preview embed
      if (customId === 'preview_embed') {
        const data = session.embedData;
        const embed = new EmbedBuilder()
          .setTitle(data.title || '')
          .setDescription(data.description || '')
          .setColor(data.color || '#2b2d31');
  
        if (data.image) embed.setImage(data.image);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.footer) embed.setFooter({ text: data.footer });
  
        return interaction.reply({ content: 'Here is your preview:', embeds: [embed], flags: MessageFlags.Ephemeral });
      }
  
      // Send embed
      if (customId === 'send_embed') {
        const data = session.embedData;
        const embed = new EmbedBuilder()
          .setTitle(data.title || '')
          .setDescription(data.description || '')
          .setColor(data.color || '#2b2d31');
  
        if (data.image) embed.setImage(data.image);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.footer) embed.setFooter({ text: data.footer });
  
        const channel = await interaction.client.channels.fetch(session.channel);
        await channel.send({ embeds: [embed] });
        delete interaction.client.embedSessions[interaction.user.id];
        return interaction.reply({ content: '✅ Embed sent!', flags: MessageFlags.Ephemeral });
      }
  
      // Cancel session
      if (customId === 'cancel_embed') {
        delete interaction.client.embedSessions[interaction.user.id];
        return interaction.reply({ content: '❌ Embed building canceled.', flags: MessageFlags.Ephemeral });
      }
    },
  
    handleModalSubmit: async (interaction) => {
      const session = interaction.client.embedSessions?.[interaction.user.id];
      if (!session) return interaction.reply({ content: '⚠️ No active embed session found.', flags: MessageFlags.Ephemeral });
  
      const [baseId] = interaction.customId.split('_modal');
      const field = baseId.replace('set_', '');
      const value = interaction.fields.getTextInputValue(`${baseId}_input`);
      session.embedData[field] = value;
  
      await interaction.reply({ content: `✅ ${field} updated!`, flags: MessageFlags.Ephemeral });
    }
  };
  