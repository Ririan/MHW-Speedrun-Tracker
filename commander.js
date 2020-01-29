const MONSTERS = require("./data/monsters.json");
const WEAPONS = require("./data/weapons.json");
const mysql = require("mysql");
const TOKENS = require('./tokens.js');

var dbConnection;

class Commander {
    _bot;
    _dbConnection;
    weapons = new Set(WEAPONS);
    monsters = new Set(MONSTERS);
    ranks = new Set(["lr", "hr", "mr"]);

    constructor(botInstance) {
		this._bot = botInstance;
		this._dbConnection = mysql.createConnection({
			host: 'localhost',
			user : 'root',
			password: TOKENS.mysqlServerRoot,
			database: "mhw_speedrun_times",
			insecureAuth: true
		});

		dbConnection = this._dbConnection;

		var connectFunction = function(err) {
			if (err) {
			  console.error('error connecting: ' + err.stack);
			  return;
			}
			console.log('connected as id ' + dbConnection.threadId);
			botInstance.registerCommand("newtime", this._addNewTime.bind(this), {
				description: "Add a new time",
				fullDescription: "Does add to the database.",
				usage: "Command must be formatted like so '!newtime Great Jagras, mr, bow, 10:32, *comment*' the comment is optional",
				argsRequired: true,
			});
			botInstance.registerCommand("gettimes", this._getTimes.bind(this), {
				description: "Get all of your times",
				fullDescription: "Will be made more useful in the future, probably",
				usage: "It just works.",
				argsRequired: false
			});
		};

		this._dbConnection.connect(connectFunction.bind(this));
    }

    // Eris returns all arguments as split by spaces, but we want them to be seperated by commas
    // While we are doing that, we also lowercase all of the arguments and remove the spaces.
    correctRecievedArguments(args) {
		let argumentString = args.join(" ");
        return argumentString.split(',');
	}

	// Returns undefined if valid, or a string describing the error if not.
	validateTime(timeString) {
		let timeParts = timeString.split(":");
		if (timeParts.length === 0 || timeParts.length > 2) {
			return "The time should be formated Minutes:Seconds, You have to include both (aka 0:54 or 10:00), and I do not accept decimals as a part of this command. "
		} 
		//We have to convert the strings to numbers to proceed.
		let minutes = Number(timeParts[0]);
		let seconds = Number(timeParts[1]);

		let numberError = [];

		if (!Number.isInteger(minutes) || minutes < 0 || minutes > 50) {
			numberError.push("The minutes cannot be a decimal and must be between 0 and 50 inclusive.");
		}
		
		if(!Number.isInteger(seconds) || seconds < 0 || seconds > 60) {
			numberError.push("The seconds cannot be a decimal and must be between 0 and 60 inclusive.");
		}

		if(minutes === 50 && seconds !== 0) {
			numberError.push("You're time has to be 50:00 or less");
		}

		if(numberError.length > 0) {
			return numberError.join(" ");
		}
	}

	_insertNewTimeIntoDB(dbConnection, userId, monster, rank, weapon, time, notes = null) {
		let date = new Date();
		let sqlTime = time.replace(":", "");
		let sql = "INSERT INTO speedrun_times SET ?";
		let inserts = {
			user_id: userId,
			date: date,
			monster: monster,
			rank: rank,
			weapon: weapon,
			time: sqlTime,
			notes: notes};

		
		return new Promise(function (resolve, reject) {
			dbConnection.query(sql, inserts,  function(err, result) {
				if (err) return reject(err);
				resolve(result);
			});
		});
	}

    // The command's proper structure should be
    // Monster, rank, weapon, time, and notes
    // Still deciding on how to handle mutliplayer hunts
    _addNewTime(msg, args) {
        console.log("Add new time command recieved");
        console.log(`Message was ${msg.content}`);
        //let testUserProfile = msg._client.getUserProfile(msg.author.id);
		//console.log(testUserProfile);
		//This allows us to ignore
		let properArguments = this.correctRecievedArguments(args, 4, true);
		let notes;
		
		if(properArguments.length > 4) {
			notes = properArguments.slice(4).join(",").trim();
		} else if (properArguments.length < 4){
			return "There's a missing argument."
		}

		properArguments = properArguments.slice(0, 4);
		properArguments = properArguments.join(",");
		properArguments = properArguments.toLowerCase().replace(/\s+/g, "");
		properArguments = properArguments.split(",");

        console.log(properArguments);
        
        let errorMessages = [];
        
        let monster = properArguments[0];
        let rank = properArguments[1];
        let weapon = properArguments[2];
        let time = properArguments[3];

        if (!this.monsters.has(monster.replace("tempered", ""))) {
			errorMessages.push("I could not find the monster you specified.");
		}

        if (!this.ranks.has(rank)) {
            errorMessages.push("The rank you specified is incorrect, I only accept ranks formated as follows, lr for low rank, hr for high rank, and mr for master rank.");
		}
		
		if (!this.weapons.has(weapon)) {
			errorMessages.push("I couldn't find the weapon you specified, make sure you typed it in correctly and try again.");
		}

		//If the time is valid, it will be undefined, otherwise it will contain a string describing why it is invalid.
		let isTheTimeInvalid = this.validateTime(time);

		if(isTheTimeInvalid) {
			errorMessages.push(isTheTimeInvalid);
		}

		if(errorMessages.length > 0 ) {
			return errorMessages.join(" ").trim();
		}

		let dbPromise = this._insertNewTimeIntoDB(dbConnection, msg.author.id, monster, rank, weapon, time, notes).then(function (results) {
			msg._client.createMessage(msg.channel.id, "Your new time has successfully been inserted.");
		}).catch(function (error) {
			msg._client.createMessage(msg.channel.id, "I have encountered an error inserting your time into the database.");
			console.error(error);
		});

        return "Thanks, I appreciate it.  I'll get right on inserting your new time into the database.";
	}
	
	_getTimes(msg, args) {
		dbConnection.query("SELECT * FROM speedrun_times WHERE user_id = ?", msg.author.id, function (err, results, fields) {
			console.log(results);
			let responseMessage = "";
			for (let result of results) {
				responseMessage += `${result.rank} ${result.monster} in ${result.time} with ${result.weapon}. Notes were "${result.notes}". \n`;
			}
			msg._client.createMessage(msg.channel.id, responseMessage);
		})
	}
}

module.exports = Commander;