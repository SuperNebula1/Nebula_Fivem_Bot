// index.js
const { Client, GatewayIntentBits, Partials, Collection, Events, ActivityType } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const loadCommands = require('./handlers/commandLoader');
const deployCommands = require('./handlers/deployCommands');
const sendStartupMessage = require('./handlers/startupMessage');
const sendShutdownMessage = require('./handlers/shutdownMessage');

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

client.commands = new Collection();

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const statuses = [
    "Helping the server run smoothly!",
    "Use /help to see commands!",
    "Managing departments!"
  ];
  let index = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [{ name: statuses[index], type: ActivityType.Playing }],
      status: 'online'
    });
    index = (index + 1) % statuses.length;
  }, 10000);

  await loadCommands(client);
  await deployCommands(client);

  for (const [guildId] of client.guilds.cache) {
    await sendStartupMessage(client, guildId);
  }
});

client.on(Events.InteractionCreate, require('./events/interactionCreate'));

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.once(signal, async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      await sendShutdownMessage(client, guildId, guild.name);
    }
    client.destroy();
    process.exit(0);
  });
});

client.login(process.env.TOKEN);
