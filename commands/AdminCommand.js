const Utils = require("../Utils");
const utils = new Utils();

module.exports = class AdminCommand {
    constructor(data) {
        this.data = data;
    }

    async getInfoTicket(ticked_id, ticket, database) {
        const info_ticket = {
            ticked_id: ticked_id,
            messages: []
        }
        for (let message_id of ticket.messages_numbers) {
            const message = await database.getDataMessage(message_id);
            let name = ticket.username;
            if (message.discord_id !== ticket.ownerDiscordID) {
                name = await database.getName(message.discord_id);
            }
            info_ticket.messages.push({discord_id: message.discord_id, message: message.message, name: name});
        }
        return info_ticket;
    }

    async showTicket(ticket_id, database, userRole) {
        const ticket = await database.getOfflineTicket(ticket_id);
        const ticket_info = await this.getInfoTicket(ticket_id, ticket, database);

        let text_message = `Set role: ${ticket.role}\n`;
        text_message += `Title: ${ticket.title}\n`
        text_message += `Date created: ${ticket.date_created}\n`
        if (ticket.date_closed !== '-')
            text_message += `Date closed: ${ticket.date_closed}\n`

        this.data.message.channel.send(`${text_message}\n`);
        for (let answer_object of ticket_info.messages) {
            this.data.message.channel.send(`${answer_object.name + " say: " + answer_object.message}`);
        }

        let button1 = new this.data.disbut.MessageButton()
            .setStyle('green')
            .setLabel('Add message')
            .setID(`btnAnswerModeratorTicket_${ticket_id}`);

        let button2 = new this.data.disbut.MessageButton()
            .setStyle('red')
            .setLabel('Close ticket')
            .setID(`btnCloseModeratorTicket_${ticket_id}`);

        let button3 = new this.data.disbut.MessageButton()
            .setStyle('blurple')
            .setLabel('Set role')
            .setID(`btnSetRole_${ticket_id}`);

        if (userRole !== "admin") {
            button3 = new this.data.disbut.MessageButton()
                .setStyle('blurple')
                .setLabel('Back ticket')
                .setID(`btnBackTicket_${ticket_id}`);
        }

        let row = new this.data.disbut.MessageActionRow();
        if (ticket.status !== "CLOSED") {
            row.addComponent(button1);
            row.addComponent(button2);
            row.addComponent(button3);
            this.data.message.channel.send(`--= Action =--`, row);
        } else {
            row.addComponent(button1);
            row.addComponent(button3);
            this.data.message.channel.send(`--= Action =--`, row);
        }
    }


    async showMenuTickets(database, status, role, i) {
        const select = new this.data.disbut.MessageMenu()
            .setID((`viewAdminTicket_${status}`))
            .setPlaceholder(`Select ticket ${status}`);

        const dataTickets = (role !== "admin") ? await database.getAllTicketsCorrectRole(status, role) : await database.getAllTickets(status);

        let count = i;
        while (count < dataTickets.length) {
            if (count % 25 === 0 && count !== 0) {
                // const nextPage = new this.data.disbut.MessageMenuOption()
                //     .setLabel(`Next ${count+2}`)
                //     .setValue(`next_${count+2}`)
                //     .setDescription(`Next page`);
                // select.addOption(nextPage);
                //
                // const backPage = new this.data.disbut.MessageMenuOption()
                //     .setLabel(`Back ${count-23}`)
                //     .setValue(`back_${count-23}`)
                //     .setDescription(`Back page`);
                // select.addOption(backPage);
                break;
            }
            let data = dataTickets[count];
            const option = new this.data.disbut.MessageMenuOption()
                .setLabel(utils.cut(`Title: ${data.title}`))
                .setValue(`ticketId_${data.id}`)
                .setDescription(utils.cut(`Created: ${data.username}`));
            select.addOption(option);
            count++;
        }
        if (count > 0) {
            this.data.message.channel.send(`Select ticket`, select);
        } else {
            this.data.message.reply("Not found ticket.");
        }
    }

    async showMotd(/*User*/ user, database, role) {
        const select = new this.data.disbut.MessageMenu()
            .setID('adminTickets')
            .setPlaceholder('View tickets')

        const optionPending = new this.data.disbut.MessageMenuOption()
            .setLabel(`⏳ Pending`)
            .setValue(`PENDING_${role}`)
        const optionAnswered = new this.data.disbut.MessageMenuOption()
            .setLabel(`✅ Answered`)
            .setValue(`ANSWERED_${role}`)
        const optionClosed = new this.data.disbut.MessageMenuOption()
            .setLabel(`🔘 Closed`)
            .setValue(`CLOSED_${role}`)

        if (role !== "admin") {
            optionPending.setDescription(utils.cut(`Count tickets: ${await database.getCountTicketsCorrectRole("PENDING", role)}`));
            optionAnswered.setDescription(utils.cut(`Count tickets: ${await database.getCountTicketsCorrectRole("ANSWERED", role)}`));
            optionClosed.setDescription(utils.cut(`Count tickets: ${await database.getCountTicketsCorrectRole("CLOSED", role)}`));
        } else {
            optionPending.setDescription(utils.cut(`Count tickets: ${await database.getCountTickets("PENDING")}`));
            optionAnswered.setDescription(utils.cut(`Count tickets: ${await database.getCountTickets("ANSWERED")}`));
            optionClosed.setDescription(utils.cut(`Count tickets: ${await database.getCountTickets("CLOSED")}`));
        }

        select.addOption(optionPending);
        select.addOption(optionAnswered);
        select.addOption(optionClosed);

        this.data.message.channel.send( user.getUsername() + `, welcome in support panel\nYour role: ${role}`, select);
    }
}