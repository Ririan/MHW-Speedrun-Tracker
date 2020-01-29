const Eris = require('eris');
const mysql = require('mysql');
const TOKENS = require('./tokens.js');
const Commander = require('./commander.js');

var mhwCommander;

const bot = new Eris.CommandClient(TOKENS.discordBot, {}, {
    description: 'A MHW World Speedrun Tracker bot made with Eris',
    owner: 'Ririan',
    prefix: '!'
});

let dbSuccessfulConnection = false;
let dbRejectionReason = "No response recieved yet";

bot.on('ready', () => { // When the bot is ready
    console.log('I have connected to Discord.');
    mhwCommander = new Commander(bot);
});

bot.registerCommand('ping', 'Pong!', {
    description: 'Pong!',
    fullDescription: 'Use this to check if the bot is up, or to annoy other people.'
});

bot.registerCommand("database-status", function (test) {
        if (dbSuccessfulConnection) {
            return "I have successfully connected to the MySQL Database."
        }
        return "I have failed to connect to the MySQL Database.  Reason: " + dbRejectionReason;
    }, {
    description: 'Status of database connection.',
    fullDescription: 'Checks whether or not the bot connected to the database successfully or not'
});

bot.connect(); // Get the bot to connect to Discord
