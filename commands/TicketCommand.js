const Utils = require("../Utils");
const utils = new Utils();
const waitingTimeConfig = require("../waitingTimeConfig.json");

module.exports = class TicketCommand {
    constructor(data) {
        this.data = data;
    }

    async showOwnTicket(/*User*/ user, pool) {
        let select = new this.data.disbut.MessageMenu()
            .setID('tickets')
            .setPlaceholder('Check tickets')
        const data = this.data;
        pool.query("SELECT * FROM tickets WHERE discord_id=? ORDER BY status='PENDING' DESC, status='ANSWERED' DESC, id DESC LIMIT 25;", [user.getDiscordID()], function (error, results) {
            if (error) throw error;
            if (results.length === 0) {
                data.message.reply("Not found ticket.");
                return;
            }
            for (let row of results) {
                let option = new data.disbut.MessageMenuOption()
                    .setLabel(utils.cut(`№ ${row.id} | ${row.title}`))
                    .setValue(utils.cut(`${row.id}`))
                    .setDescription(utils.cut(`Status ${row.status}`))
                switch (row.status) {
                    case "PENDING":
                        option.setEmoji('⏳');
                        break
                    case "ANSWERED":
                        option.setEmoji('✅');
                        option.setDescription(utils.cut(`Answered: ${row.answered}`));
                        break
                    default:
                        option.setEmoji('🔘')
                }
                select.addOption(option);
            }
            data.message.channel.send('Tickets menu', select);
        });
    }
    async postTicket(/*User*/ user, database) {
        const data = this.data;
        const ticket = user.ticket;

        const message_id = await database.createMessageID(user, ticket.description);
        ticket.clearMessageIDs()
        ticket.addMessageID(message_id);
        await database.createTicket(ticket);
        data.message.reply(`Excellent! Your ticket has been sent!\nNumber: ${await database.getLastCreatedTicketId(user)}\nTitle: ${user.ticket.title}\nDescription: ${user.ticket.description}\n⏳ Estimated waiting time: ${waitingTimeConfig["waitingTime"]} minutes`);
    }
    async showCreatingPanel(/*User*/ user) {

        let btnPostTicket = new this.data.disbut.MessageButton()
            .setStyle('green')
            .setLabel('Send ticket')
            .setID('btnPostTicket')
            .setDisabled(true)
        if (user.ticket.title && user.ticket.description) {
            btnPostTicket.setDisabled(false);
        }

        let btnPostTicketTitle = new this.data.disbut.MessageButton()
            .setStyle('gray')
            .setLabel('Add title')
            .setID('btnPostTicketTitle')
        if (user.ticket.title) {
            btnPostTicketTitle.setStyle('blurple')
            btnPostTicketTitle.setLabel('Сhange title')
        }

        let btnPostTicketDescription = new this.data.disbut.MessageButton()
            .setStyle('gray')
            .setLabel('Enter Description')
            .setID('btnPostTicketDescription')
        if (user.ticket.description) {
            btnPostTicketDescription.setStyle('blurple')
            btnPostTicketDescription.setLabel('Change Description')
        }


        let btnTicketClose = new this.data.disbut.MessageButton()
            .setStyle('red')
            .setLabel('Cancel')
            .setID('btnTicketClose')

        let row = new this.data.disbut.MessageActionRow()
            .addComponents(btnPostTicket, btnPostTicketTitle, btnPostTicketDescription, btnTicketClose);

        let title = (user.ticket.title === undefined) ? "not filled" : user.ticket.title;
        let description = (user.ticket.description === undefined || user.ticket.description === "") ? "not filled" : user.ticket.description;
        let text_message = `Title: ${title}\nDescription: ${description}\n\nClick on the desired button to fill`;

        this.data.message.channel.send(text_message, row);
    }
    async showMotd(/*User*/ user) {
        const btn_createTicket = new this.data.disbut.MessageButton()
            .setID('btnCreateTicket')
            .setStyle('green')
            .setLabel('Create ticket')
        if (user.ticket || user.ticket !== undefined) {
            btn_createTicket.setStyle('blurple').setLabel('Continue filling');
        }

        const btn_myTickets = new this.data.disbut.MessageButton()
            .setID('btnMyTickets')
            .setStyle('grey')
            .setLabel('My tickets')
        const row = new this.data.disbut.MessageActionRow()
            .addComponents(btn_createTicket, btn_myTickets);
        this.data.message.channel.send( user.getUsername() + ", choose one of the options", row);
    }
}
