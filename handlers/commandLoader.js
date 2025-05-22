// handlers/commandLoader.js
const path = require('path');
const fs = require('fs');
const readCommandFiles = require('./readCommandFiles');

module.exports = async (client) => {
  const commandsPath = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsPath)) {
    console.warn('[WARNING] Commands folder not found.');
    return [];
  }

  const commandData = readCommandFiles(client, commandsPath);
  return commandData;
};
