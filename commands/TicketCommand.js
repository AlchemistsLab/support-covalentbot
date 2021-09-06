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

        const ticket_id = await database.getLastCreatedTicketId(user);
        data.message.reply(`Excellent! Your ticket has been sent!\nNumber: ${ticket_id}\nTitle: ${user.ticket.title}\nDescription: ${user.ticket.description}\n⏳ Estimated waiting time: ${waitingTimeConfig["waitingTime"]} minutes`);

        const listAdminID = await database.getListRoleId("admin");
        if (listAdminID.length === 0) return;
        for (let row of listAdminID) {
            const discord_id = row.discord_id;
            const channel = await data.client.users.fetch(discord_id);
            if (!channel) return;
            const select = new this.data.disbut.MessageMenu()
                .setID((`viewAdminTicket_${ticket.status}`))
                .setPlaceholder(`Select ticket PENDING`);
            const option = new this.data.disbut.MessageMenuOption()
                .setLabel(utils.cut(`Title: ${ticket.title}`))
                .setValue(`ticketId_${ticket_id}`)
                .setDescription(utils.cut(`Created: ${user.username}`));
            select.addOption(option);
            await channel.send(`admin, a new ticket has appeared!`, select);

        }
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

        let pattern = "- Paste URL\n- Describe Issue\n- Time Issue Started\n- Frequency of Issue\n- Issue happening constantly or intermittently\n- Describe your exact use case";

        let text_message = `Title: ${title}\nDescription: ${description}\n\nPlease create a ticket according to the following template:\n${pattern}\n\nClick on the desired button to fill`;

        this.data.message.channel.send(text_message, row);
    }

    async showRequireFields(/*User*/ user) {

    }

    async showMotd(/*User*/ user) {
        const btn_createTicket = new this.data.disbut.MessageButton()
            .setID('btnCreateTicket')
            .setStyle('green')
            .setLabel('Create ticket')
        if (user.ticket) {
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
