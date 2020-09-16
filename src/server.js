const restify = require('restify');
const path = require('path');
const dotenv = require('dotenv');

// configuração do path para o arquivo .env que devera estar na raiz no projeto
const ENV_FILE = path.join(__dirname, '..', '.env');
dotenv.config({ path: ENV_FILE });

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(
    '\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator',
  );
  console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

module.exports.server = server;
