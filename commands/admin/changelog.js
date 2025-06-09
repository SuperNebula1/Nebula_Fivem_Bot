const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Manage bot changelog entries'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📜 Bot Changelog')
      .setDescription('Use the buttons below to manage the changelog.')
      .setColor('Blurple');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('changelog_adds')
        .setLabel('Add')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('changelog_edits')
        .setLabel('Edit')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('changelog_deletes')
        .setLabel('Remove')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: 64 });
  }
};
