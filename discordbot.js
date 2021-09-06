const Discord = require("discord.js");

const config = require("./config.json");
const waitingTimeConfig = require("./waitingTimeConfig.json");
const fs = require('fs');
const disbut = require('discord-buttons');
const { createPool } = require('mysql');

const TicketCommand = require("./commands/TicketCommand.js");
const AdminCommand = require("./commands/AdminCommand.js");
const UserManager = require("./UserManager.js");
const Database = require("./Database.js");
const Ticket = require("./Ticket");

const Utils = require("./Utils");
const utils = new Utils();

const MailSender = require("./MailSender");
const mailSender = new MailSender();
mailSender.setTransporter();

const client = new Discord.Client();
disbut(client);
const userManager = new UserManager();


const pool = createPool({
    connectionLimit : 0.1,
    host            : config["mysql"]["host"],
    user            : config["mysql"]["user"],
    password        : config["mysql"]["password"],
    database        : config["mysql"]["database"],
    charset         : "utf8mb4_unicode_ci"
});
const database = new Database(pool);

async function getInfoTicket(ticked_id, ticket, database) {
    const info_ticket = {
        ticked_id: ticked_id,
        messages: []
    }
    for (let message_id of ticket.messages_numbers) {
        const message = await database.getDataMessage(message_id);
        let name = (message.discord_id !== ticket.ownerDiscordID) ? await database.getName(message.discord_id) : ticket.username;
        info_ticket.messages.push({discord_id: message.discord_id, message: message.message, name: name});
    }
    return info_ticket;
}

async function responseMessage(button) {
 return await new Promise((resolve, reject) => {
     let tempMessageID = button.clicker.user.lastMessageID;
     setInterval((function fn() {
         if (button.clicker.user.lastMessageID !== tempMessageID) {

             let content = button.clicker.user.lastMessage.content;

             let Attachment = (button.clicker.user.lastMessage.attachments).array();
             Attachment.forEach(function(attachment) {
                 content += "\n" + attachment.url;
             })

             resolve(content);
             clearInterval(this);
         } else {
             return fn;
         }
     })(), 1);
 });
}


async function checkEmptyTicket(ticket) {
    return !ticket;
}

const bot = function () {
    client.on('ready', () => {
        client.api.applications(client.user.id).commands.post({
            data: {
                name: "ticket",
                description: "Create ticket"
            }
        });
        client.api.applications(client.user.id).commands.post({
            data: {
                name: "faq",
                description: "Learn more about FAQ"
            }
        });

        client.ws.on("INTERACTION_CREATE", async interaction => {
            const commandName = interaction.data.name;
            const data = {
                client: client,
                disbut: disbut,
                interaction: interaction,
            }

            const user = userManager.getUser(interaction.user.id) || userManager.createUser(interaction.user.id, interaction.user.username);
            switch (commandName) {
                case "ticket":
                    const btn_createTicket = new data.disbut.MessageButton()
                        .setID('btnCreateTicket')
                        .setStyle('green')
                        .setLabel('Create ticket')
                    if (user.ticket) {
                        btn_createTicket.setStyle('blurple').setLabel('Continue filling');
                    }

                    const btn_myTickets = new data.disbut.MessageButton()
                        .setID('btnMyTickets')
                        .setStyle('grey')
                        .setLabel('My tickets')
                    const row = new data.disbut.MessageActionRow()
                        .addComponents(btn_createTicket, btn_myTickets);

                    data.client.api.interactions(data.interaction.id, data.interaction.token).callback.post({data: {
                            type: 4,
                            data: {
                                content: user.getUsername() + ", choose one of the options",
                            }
                        }});

                    const channel = await data.client.users.fetch(data.interaction.user.id);
                    await channel.send("---------------------------------------", row);
                    break;
                case "faq":
                    data.client.api.interactions(data.interaction.id, data.interaction.token).callback.post({data: {
                            type: 4,
                            data: {
                                content: "You can find detailed information on the website\nhttps://www.covalenthq.com/docs/faqs",
                            }
                        }});

                    const btn_createTicket1 = new data.disbut.MessageButton()
                        .setID('btnCreateTicket')
                        .setStyle('green')
                        .setLabel('Create ticket')
                    if (user.ticket) {
                        btn_createTicket1.setStyle('blurple').setLabel('Continue filling');
                    }
                    const row1 = new data.disbut.MessageActionRow()
                        .addComponents(btn_createTicket1);

                    const channel1 = await data.client.users.fetch(data.interaction.user.id);
                    channel1.send(user.getUsername() + ", if you have any questions, feel free to ask us.", row1);
                    break;
            }
        });
    });





    client.on('clickMenu', async (menu) => {
        menu.reply.defer(true);
        if (menu.channel.hasOwnProperty('guild')) return;

        const data = {
            disbut: disbut,
            message: menu.message
        }

        switch (menu.id) {
            case "tickets":
                const ticket_id = menu.values[0];
                const ticket = await database.getOfflineTicket(ticket_id);
                const ticket_info = await getInfoTicket(ticket_id, ticket, database);

                let text_message = `Title: ${ticket.title}\n`;
                text_message += `Date created: ${ticket.date_created}\n`
                if (ticket.date_closed !== '-')
                    text_message += `Date closed: ${ticket.date_closed}\n`
                text_message += "\n";

                data.message.channel.send(`${text_message}`);

                for (let answer_object of ticket_info.messages) {
                    data.message.channel.send(`${answer_object.name + " say: " + answer_object.message}`);
                }

                let button1 = new data.disbut.MessageButton()
                    .setStyle('blurple')
                    .setLabel('Add message')
                    .setID(`btnAnswerTicket_${ticket_id}`)

                let button2 = new data.disbut.MessageButton()
                    .setStyle('red')
                    .setLabel('Close ticket')
                    .setID(`btnCloseTicket_${ticket_id}`)

                let row = new data.disbut.MessageActionRow();
                if (ticket.status !== "CLOSED") {
                    row.addComponent(button1);
                    row.addComponent(button2);
                    data.message.channel.send(`--= Action =--`, row);
                }

                break
            case "adminTickets":
                const selectOption = menu.values[0];
                const dataOption = selectOption.split("_");
                switch (dataOption[0]) {
                    case "PENDING":
                        await new AdminCommand(data).showMenuTickets(database, "PENDING", await(database.getRole(menu.clicker.user.id)), 0);
                        break;
                    case "ANSWERED":
                        await new AdminCommand(data).showMenuTickets(database, "ANSWERED", await(database.getRole(menu.clicker.user.id)), 0);
                        break
                    case "CLOSED":
                        await new AdminCommand(data).showMenuTickets(database, "CLOSED", await(database.getRole(menu.clicker.user.id)), 0);
                        break;
                }
        }
        if (menu.id.includes("viewAdminTicket_")) {
            const selectOption = menu.values[0];
            if (selectOption.includes("ticketId_")) {
                const ticketId = selectOption.split("_")[1];
                await new AdminCommand(data).showTicket(ticketId, database, await database.getRole(menu.clicker.user.id));
            }
        }

    });

    client.on('clickButton', async (button) => {
        if (button.clicker.user.bot) return;
        if (button.channel.hasOwnProperty('guild')) return;
        button.reply.defer(true);

        const data = {
            client: client,
            disbut: disbut,
            message: button.message,
        }

        const user = userManager.getUser(button.clicker.user.id);
        switch (button.id) {
            case "btnCreateTicket":
                if (!user.ticket) user.ticket = new Ticket(user);
                await new TicketCommand(data).showCreatingPanel(user);
                break;
            case "btnPostTicketTitle":
                if (await checkEmptyTicket(user.ticket)) {
                    await button.message.reply("Please create ticket.");
                    break;
                }
                await button.message.reply("Excellent. Enter title");
                const response_title = await responseMessage(button);

                if (response_title.toString().length > 100) {
                    await button.clicker.user.lastMessage.reply("Please enter your title below 100 characters");
                    break;
                }

                user.ticket.title = response_title;
                await button.clicker.user.lastMessage.reply("Ticket title set: " + response_title);
                await new TicketCommand(data).showCreatingPanel(userManager.getUser(button.clicker.user.id));
                break;
            case "btnPostTicketDescription":
                if (await checkEmptyTicket(user.ticket)) {
                    await button.message.reply("Please create ticket.");
                    break;
                }

                await button.message.reply("Good. Enter description");
                const response_description = await responseMessage(button);

                if (response_description.toString().length > 2000) {
                    await button.clicker.user.lastMessage.reply("Please enter your description below 2000 characters");
                    break;
                }

                user.ticket.clearDescription();
                user.ticket.addTextInDescription(response_description);
                await button.message.reply("Ticket description set: " + response_description);
                await new TicketCommand(data).showCreatingPanel(userManager.getUser(button.clicker.user.id));
                break;
            case "btnPostTicket":
                if (await checkEmptyTicket(user.ticket)) {
                    await button.message.reply("Please create ticket.");
                    break;
                }
                await new TicketCommand(data).postTicket(user, database);
                user.ticket = null;
                break;
            case "btnMyTickets":
                await new TicketCommand(data).showOwnTicket(userManager.getUser(button.clicker.user.id), pool);
                break;
            case "btnTicketClose":
                userManager.getUser(button.clicker.user.id).clearTicket();
                new TicketCommand(data).showMotd(userManager.getUser(button.clicker.user.id));
                break
        }


        if (button.id.includes("btnAnswerTicket_")) {
            const ticket_id = button.id.split("_")[1];
            await data.message.reply("Enter additional message");
            const response_message = await responseMessage(button);
            const current_ticket = await database.getOfflineTicket(ticket_id);
            current_ticket.status = "PENDING";

            const message_id = await database.createMessageID(user, response_message);
            current_ticket.addMessageID(message_id);

            await database.updateTicket(ticket_id, current_ticket);
            await data.message.reply("Done.");


            const listRoleID = await database.getListRoleId(current_ticket.role);
            if (listRoleID.length === 0) return;
            for (let row of listRoleID) {
                const discord_id = row.discord_id;
                const channel = await data.client.users.fetch(discord_id);
                if (!channel) return;
                const select = new data.disbut.MessageMenu()
                    .setID((`viewAdminTicket_${current_ticket.status}`))
                    .setPlaceholder(`Select ticket ${current_ticket.role}`);
                const option = new data.disbut.MessageMenuOption()
                    .setLabel(utils.cut(`Title: ${current_ticket.title}`))
                    .setValue(`ticketId_${ticket_id}`)
                    .setDescription(utils.cut(`Created: ${user.username}`));
                select.addOption(option);
                await channel.send(`${current_ticket.role}, a new ticket has appeared!`, select);
            }
        }



        if (button.id.includes("btnAnswerModeratorTicket_")) {
            const ticked_id = button.id.split("_")[1];
            await data.message.reply("Enter additional message");
            const response_message = await responseMessage(button);
            const current_ticket = await database.getOfflineTicket(ticked_id);
            const message_id = await database.createMessageID(user, response_message);
            current_ticket.addMessageID(message_id);

            current_ticket.status = "ANSWERED";
            current_ticket.answered = await database.getName(button.clicker.user.id);

            await database.updateTicket(ticked_id, current_ticket);
            await data.message.reply("Done.");

            await new AdminCommand(data).showTicket(ticked_id, database, await database.getRole(button.clicker.user.id));
            client.users.fetch(current_ticket.ownerDiscordID, false).then(user => {
                if (!userManager.containsUser(current_ticket.ownerDiscordID))
                    userManager.createUser(user.id, user.username);

                let button = new data.disbut.MessageButton()
                    .setStyle('grey')
                    .setLabel('My tickets')
                    .setID('btnMyTickets')
                let row = new data.disbut.MessageActionRow()
                    .addComponents(button);
                user.send("You have received a reply to your ticket!", row);
            });
        }
        if (button.id.includes("btnCloseTicket_")) {
            const ticked_id = button.id.split("_")[1];
            const ticket = await database.getOfflineTicket(ticked_id);
            const date = new Date();

            ticket.date_closed = date.toLocaleDateString() + " " + date.toLocaleTimeString();
            ticket.status = "CLOSED";
            await database.updateTicket(ticked_id, ticket);
            await data.message.reply("Ticket closed");
        }

        if (button.id.includes("btnSendMain_")) {
            const ticket_id = button.id.split("_")[1];
            const ticket = await database.getOfflineTicket(ticket_id);


            const ticket_info = await getInfoTicket(ticket_id, ticket, database);



            let fullDescription = `Technical information:<br>
            ----------<br>
            Created user discord id: ${ticket.ownerDiscordID}<br>
            Status: ${ticket.status}<br>
            Date ${ticket.date_created} / ${ticket.date_closed}<br>
            Role: ${ticket.role}<br>
            ----------<br>
            Ticket:<br>
            Title: ${ticket.title}<br>
            Messages:<br>
            `;

            for (let answer_object of ticket_info.messages) {
                fullDescription += `${answer_object.name} say: ${answer_object.message} <br>`;
            }

            mailSender.send(config["mail"]["user"], config["mail"]["recipient"], `Received ticket #${ticket_id}`, fullDescription);
            await data.message.reply("Data ticket sent to support bot email");

        }

        if (button.id.includes("btnSetRole_")) {
            const ticked_id = button.id.split("_")[1];
            const ticket = await database.getOfflineTicket(ticked_id);

            await data.message.reply("Enter text role.");

            ticket.role = await responseMessage(button)
            await database.updateTicket(ticked_id, ticket);

            await data.message.reply("Ticket set role.");
        }
        if (button.id.includes("btnBackTicket_")) {
            const ticked_id = button.id.split("_")[1];
            const ticket = await database.getOfflineTicket(ticked_id);
            ticket.role = "admin";
            await database.updateTicket(ticked_id, ticket);
            await data.message.reply("Ticket back in admins.");
        }
        if (button.id.includes("btnCloseModeratorTicket_")) {
            const ticked_id = button.id.split("_")[1];
            const ticket = await database.getOfflineTicket(ticked_id);
            ticket.status = "CLOSED";
            const date = new Date();
            ticket.date_closed = date.toLocaleDateString() + " " + date.toLocaleTimeString();
            await database.updateTicket(ticked_id, ticket);
            await data.message.reply("Ticket closed.");
        }


    });
    client.on("message", async function (message) {
        if (message.author.bot) return;

        if (!message.content.startsWith("/")) return;
        if (message.channel.hasOwnProperty('guild')) return;

        const prefix = "/";
        const commandBody = message.content.slice(prefix.length);
        const args = commandBody.split(' ');
        const command = args.shift().toLowerCase();

        const data = {
            client: client,
            disbut: disbut,
            args: args,
            message: message,
        }

        const user = userManager.getUser(message.author.id) || userManager.createUser(message.author.id, message.author.username);
        switch (command) {
            case "admin":
                const role = await database.getRole(message.author.id);
                if (role === 'user') {
                    data.message.reply("No permissions.")
                    return;
                }
                await new AdminCommand(data).showMotd(user, database, role);
                break
            case "faq":
                data.message.reply("You can find detailed information on the website\nhttps://www.covalenthq.com/docs/faqs");
                const btn_createTicket = new data.disbut.MessageButton()
                    .setID('btnCreateTicket')
                    .setStyle('green')
                    .setLabel('Create ticket')
                if (user.ticket || user.ticket !== undefined) {
                    btn_createTicket.setStyle('blurple').setLabel('Continue filling');
                }
                const row = new data.disbut.MessageActionRow()
                    .addComponents(btn_createTicket);
                data.message.channel.send( user.getUsername() + ", if you have any questions, feel free to ask us.", row);
                break;
            case "setwaitingtime":
                if (await database.getRole(message.author.id) === 'user') {
                    data.message.reply("No permissions.")
                    return;
                }
                data.message.reply("Time set: " + args[0]);
                waitingTimeConfig["waitingTime"] = args[0];

                new Promise((resolve, reject) => {
                    fs.writeFile("waitingTimeConfig.json", JSON.stringify(waitingTimeConfig), (err) => {
                        if (err) {
                            reject(err);
                        }
                        resolve(true);
                    });
                });

                break
            case "getdiscordid":
                message.reply("Your discord id: " + message.author.id);
                break
        }
    });
    client.login(config["settings"]["BOT_TOKEN"]);
}

module.exports = function () {
    return bot();
}

