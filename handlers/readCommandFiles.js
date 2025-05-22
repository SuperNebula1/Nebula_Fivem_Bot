// handlers/readCommandFiles.js
const fs = require('fs');
const path = require('path');

module.exports = function readCommandFiles(client, dir) {
  let commandDataArray = [];

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);

    if (stat.isDirectory()) {
      commandDataArray = commandDataArray.concat(readCommandFiles(client, filePath));
    } else if (file.endsWith('.js')) {
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandDataArray.push(command.data.toJSON());
      } else {
        console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
      }
    }
  }

  return commandDataArray;
};