const Discord = require("discord.js");
const config = require("./config.json");
const disbut = require('discord-buttons');

var sqlite3 = require('sqlite3').verbose();

const AdminCommand = require("./commands/adminCommand.js");
const TicketCommand = require("./commands/ticketCommand.js");

const client = new Discord.Client();
disbut(client);

const Status = {
    NONE: 'NONE',
    CREATE_TICKET_TITLE: 'CREATE_TICKET_TITLE',
    CREATE_TICKET_DESCRIPTION: 'CREATE_TICKET_DESCRIPTION',
    ANSWER_TICKET: 'ANSWER_TICKET'
}

class Ticket {
    setTitle(title) {
        this.title = title;
    }
    setDescription(description) {
        this.description = description;
    }
    getTitle() {
        return this.title;
    }
    getDescription() {
        return this.description;
    }
}

class User {
    constructor(discord_id, username) {
        this.discord_id = discord_id;
        this.username = username;
        this.ticket = new Ticket();
    }
    setStatus(status) {
        this.status = status;
    }
    getStatus(status) {
        return this.status;
    }
    getDiscordID() {
        return this.discord_id;
    }
    userName() {
        return this.username;
    }
    setTempObj(tempObj) {
        this.tempObj = tempObj;
    }
    getTempObj() {
        return this.tempObj;
    }
}

class UserManager {
    users = {}
    contains(discord_id) {
        return this.users.hasOwnProperty(discord_id)
    }
    createUser(discord_id, username) {
        this.users[discord_id] = new User(discord_id, username);
    }
    getUser(discord_id) {
        return this.users[discord_id];
    }
}

const userManager = new UserManager();
const ticketCommand = new TicketCommand();

async function handlingMessage(message) {
    if (!userManager.contains(message.author.id)) return;
    data = {
        addonMessage: disbut,
        message: message
    }

    let user = userManager.getUser(message.author.id);
    if (user.getStatus() === Status.CREATE_TICKET_TITLE) {
        user.ticket.setTitle(message.content);
        message.reply("Ticket header set: " + message.content);
        ticketCommand.showPanelTicket(data, user);
        user.setStatus(Status.NONE);
    }
    if (user.getStatus() === Status.CREATE_TICKET_DESCRIPTION) {
        user.ticket.setDescription(message.content);
        message.reply("Description for ticket is set: " + message.content);
        ticketCommand.showPanelTicket(data, user);
        user.setStatus(Status.NONE);
    }

    if (user.getStatus() === Status.ANSWER_TICKET) {
        let current_ticket = await ticketCommand.getInfoTicket(data, new sqlite3.Database("database.db"), user.getTempObj().ticket_id);
        await ticketCommand.answerTicket(data, user, user.getTempObj().ticket_id, data.message.content, new sqlite3.Database("database.db"), current_ticket);
        user.setStatus(Status.NONE);
        user.setTempObj(undefined);
        data.message.reply("Done!");
    }
}

async function isModerator(discord_id, db) {
    let result = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM users WHERE discord_id='${discord_id}' AND privilege='MODERATOR' LIMIT 1;`, function (err, rows) {
            if (!err) {
                if (rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } else{
                console.log(err);
            }
        });
    });
    db.close()
    return result;
}

function postTicket(data, user) {
    let db = new sqlite3.Database("database.db");
    //создания сообщения
    db.run(`INSERT INTO messages (discord_id, message) VALUES ('${user.getDiscordID()}', '${user.ticket.getDescription()}')`);
    db.all(`SELECT id FROM messages WHERE discord_id='${user.getDiscordID()}' ORDER BY id DESC LIMIT 1;`, function (err, rows) {
        if (!err) {
            let message_id = rows[0].id;
            //добавление строки в тикет
            db.run(`INSERT INTO tickets (discord_id, title, description, status) VALUES ('${user.getDiscordID()}', '${user.ticket.getTitle()}', '${message_id}', 'WAITTING')`);
            if (!err) {
                //обработка внутри таблицы tickets
                db.all(`SELECT id FROM tickets WHERE discord_id='${user.getDiscordID()}' AND status='WAITTING' ORDER BY id DESC LIMIT 1;`, function (err, rows) {
                    data.message.reply(`Excellent! Your ticket has been sent!\nNumber: ${rows[0].id}\nTitle: ${user.ticket.title}\nОписание: ${user.ticket.description}`);
                    userManager.createUser(user.getDiscordID(), user.userName());
                });
            } else{
                console.log(err);
            }
        } else{
            console.log(err);
        }
    });
    db.close()
}

function setTicketStatus(ticket_id, status) {
    let db = new sqlite3.Database("database.db");
    db.run(`UPDATE tickets SET status = '${status}' WHERE id = ${ticket_id}`);
}


const bot = function () {
    client.on('clickMenu', async (menu) => {
        data = {
            addonMessage: disbut,
            message: menu.message
        }

        let ticket_id = menu.values[0];
        let ticket = await ticketCommand.getInfoTicket(data, new sqlite3.Database("database.db"), ticket_id)

        let text_message = `Title: ${ticket.title}\n\n`;
        for (let answer_object of ticket.messages) {
            if (menu.clicker.user.id === answer_object.discord_id) {
                text_message += `You: ${answer_object.text}\n\n`;
            } else if (await isModerator(answer_object.discord_id, new sqlite3.Database("database.db"))) {
                text_message += `Moderator: ${answer_object.text}\n\n`;
            } else {
                text_message += `User: ${answer_object.text}\n\n`;
            }
        }


        let button1 = new data.addonMessage.MessageButton()
            .setStyle('blurple')
            .setLabel('Add message')
            .setID(`btnAnswerTicket_${ticket_id}`)

        let button2 = new data.addonMessage.MessageButton()
            .setStyle('red')
            .setLabel('Close ticket')
            .setID(`btnCloseTicket_${ticket_id}`)

        let row = new data.addonMessage.MessageActionRow().addComponent(button1);
        if (ticket.status !== "CLOSED")
            row.addComponent(button2);
        data.message.channel.send(`${text_message}`, row)
        menu.reply.defer(true);
    });

    client.on('clickButton', async (button) => {
        if (button.clicker.user.bot) return;
        data = {
            addonMessage: disbut,
            message: button.message
        }
        let user = userManager.getUser(button.clicker.user.id);
        switch (button.id) {
            case "btnCreateTicket":
                ticketCommand.showPanelTicket(data, user)
                break
            case "btnPostTicketTitle":
                ticketCommand.postTicketTitle(data, user)
                break
            case "btnPostTicketDescription":
                ticketCommand.postTicketDescription(data, user)
                break
            case "btnTicketClose":
                userManager.createUser(user.getDiscordID(), user.userName());
                ticketCommand.execute(data, userManager.getUser(button.clicker.user.id));
                break
            case "btnPostTicket":
                postTicket(data, user);
                break
            case "btnMyTickets":
                ticketCommand.showOwnTickets(data, new sqlite3.Database("database.db"), user);
                break;
            case "btnShowTicket_WAITTING":
                if (await isModerator(user.getDiscordID(), new sqlite3.Database("database.db"))) {
                    new AdminCommand().showTickets(data, new sqlite3.Database("database.db"), "WAITTING");
                }
                break
            case "btnShowTicket_ANSWERED":
                if (await isModerator(user.getDiscordID(), new sqlite3.Database("database.db"))) {
                    new AdminCommand().showTickets(data, new sqlite3.Database("database.db"), "ANSWERED");
                }
                break
            case "btnShowTicket_CLOSED":
                if (await isModerator(user.getDiscordID(), new sqlite3.Database("database.db"))) {
                    new AdminCommand().showTickets(data, new sqlite3.Database("database.db"), "CLOSED");
                }
                break
        }

        if (button.id.includes("btnAnswerTicket_")) {
            let ticked_id = button.id.split("_")[1];
            data.message.reply("Enter additional message");
            user.setTempObj({ticket_id: ticked_id})
            user.setStatus(Status.ANSWER_TICKET);
            setTicketStatus(ticked_id, "WAITTING");

            if (await isModerator(button.clicker.user.id, new sqlite3.Database("database.db"))) {
                setTicketStatus(ticked_id, "ANSWERED");
            } else {
                setTicketStatus(ticked_id, "WAITTING");
            }
        }

        if (button.id.includes("btnCloseTicket_")) {
            let ticked_id = button.id.split("_")[1];
            setTicketStatus(ticked_id, "CLOSED");
            data.message.reply("Ticket closed");
        }

        button.reply.defer(true);
    });

    //handling message
    client.on("message", async function (message) {
        if (message.author.bot) return;
        const prefix = "/";
        if (!message.content.startsWith(prefix)) {
            await handlingMessage(message);
            return;
        }
        const commandBody = message.content.slice(prefix.length);
        const args = commandBody.split(' ');
        const command = args.shift().toLowerCase();
        if (!userManager.contains(message.author.id))
            userManager.createUser(message.author.id, message.author.username)
        const user = userManager.getUser(message.author.id)
        user.setStatus(Status.NONE);
        user.setTempObj(undefined);
        data = {
            client: client,
            addonMessage: disbut,
            message: message
        }
        switch (command) {
            case "ticket":
                new TicketCommand().execute(data, user);
                break
            case "admin":
                if (await isModerator(user.getDiscordID(), new sqlite3.Database("database.db"))) {
                    new AdminCommand().execute(data, user, new sqlite3.Database("database.db"));
                } else {
                    message.reply("No rights.");
                }
                break
            case "getdiscordid":
                message.reply("Your Discord ID " + user.getDiscordID());
                break
        }

    });
    client.login(config["settings"]["BOT_TOKEN"]);
}

module.exports = function () {
    return bot();
}

