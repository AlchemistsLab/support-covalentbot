const Status = {
    NONE: 'NONE',
    CREATE_TICKET_TITLE: 'CREATE_TICKET_TITLE',
    CREATE_TICKET_DESCRIPTION: 'CREATE_TICKET_DESCRIPTION',
}


async function getInfoTicket(db, ticked_id) {
    const ticket = {
        ticked_id: ticked_id,
        messages: []
    }

    await new Promise((resolve_ticket, reject) => {
        db.all(`SELECT * FROM tickets WHERE id='${ticked_id}' LIMIT 1;`, async function (err, rows) {
            if (!err) {
                ticket.title = rows[0].title;
                ticket.status = rows[0].status;
                ticket.discord_id = rows[0].discord_id;
                ticket.message_ids = rows[0].description;
                let message_ids = rows[0].description.split(",");
                for (let message_id of message_ids) {
                    let result = await new Promise((resolve_message, reject) => {
                        db.all(`SELECT message,discord_id FROM messages WHERE id='${message_id}' LIMIT 1;`, async function (err, rows) {
                            resolve_message(rows[0]);
                        });
                    });
                    ticket.messages.push({discord_id: result.discord_id, text: result.message});
                }
            } else {
                console.log(err);
            }
            resolve_ticket();
        });
    });

    db.close();
    return ticket;
}


async function addMessageInTicket(data, user, ticket_id, message_text, db, current_ticket) {
    //check permissions

    await new Promise((resolve_ticket, reject) => {
        db.run(`INSERT INTO messages (discord_id, message) VALUES ('${user.getDiscordID()}', '${message_text}')`);
        db.all(`SELECT id FROM messages WHERE discord_id='${user.getDiscordID()}' ORDER BY id DESC LIMIT 1;`, function (err, rows) {
            if (!err) {
                let message_id = rows[0].id;
                //добавление строки в тикет
                let message_ids = current_ticket.message_ids + "," + message_id;
                db.run(`UPDATE tickets SET description = '${message_ids}' WHERE id = ${ticket_id}`);
                resolve_ticket();
            } else{
                console.log(err);
            }
        });
    });
    db.close()
    return true;
}

module.exports = function () {
    this.getInfoTicket = async function (data, db, ticked_id) {
        return await getInfoTicket(db, ticked_id)
    }

    this.execute = function (data, user) {
        let button = new data.addonMessage.MessageButton()
            .setStyle('green')
            .setLabel('Create ticket')
            .setID('btnCreateTicket')

        if (user.ticket.getTitle() || user.ticket.getDescription()) {
            button.setStyle('blurple').setLabel('Continue filling');
        }

        let button2 = new data.addonMessage.MessageButton()
            .setStyle('grey')
            .setLabel('My tickets')
            .setID('btnMyTickets')

        let row = new data.addonMessage.MessageActionRow()
            .addComponents(button, button2);

        data.message.channel.send( user.userName() + ", Choose one of the options", row);
    }

    this.showOwnTickets = function (data, db, user) {
        let select = new data.addonMessage.MessageMenu()
            .setID('tickets')
            .setPlaceholder('Check tickets')

        db.all(`SELECT * FROM tickets WHERE discord_id='${user.getDiscordID()}' ORDER BY status='WAITTING' DESC, status='ANSWERED' DESC, id DESC;`, function (err, rows) {
            if (!err) {
                if (rows.length > 0) {
                    for (let i = 0; i < rows.length; ++i) {
                    let option = new data.addonMessage.MessageMenuOption()
                        .setLabel(`№ ${rows[i].id} | ${rows[i].title}`)
                        .setValue(`${rows[i].id}`)
                        .setDescription(`Status ${rows[i].status}`)
                    switch (rows[i].status) {
                        case "WAITTING":
                            option.setEmoji('⏳');
                            break
                        case "ANSWERED":
                            option.setEmoji('✅');
                            break
                        default:
                            option.setEmoji('🔘')
                    }
                    select.addOption(option);
                    }
                    data.message.channel.send('Tickets menu', select);
                } else {
                    data.message.reply("Not found ticket.");
                }
         
            } else{
                console.log(err);
            }
        });
    }

    this.showPanelTicket = function (data, user) {
        let button1 = new data.addonMessage.MessageButton()
            .setStyle('green')
            .setLabel('Send text')
            .setID('btnPostTicket')
            .setDisabled(true)
        if (user.ticket.getTitle() && user.ticket.getDescription()) {
            button1.setDisabled(false);
        }

        let button2 = new data.addonMessage.MessageButton()
            .setStyle('gray')
            .setLabel('Add title')
            .setID('btnPostTicketTitle')
        if (user.ticket.getTitle()) {
            button2.setStyle('blurple')
            button2.setLabel('Сhange title')
        }

        let button3 = new data.addonMessage.MessageButton()
            .setStyle('gray')
            .setLabel('Enter Description')
            .setID('btnPostTicketDescription')
        if (user.ticket.getDescription()) {
            button3.setStyle('blurple')
            button3.setLabel('Change Description')
        }


        let button4 = new data.addonMessage.MessageButton()
            .setStyle('red')
            .setLabel('Cancel')
            .setID('btnTicketClose')

        let row = new data.addonMessage.MessageActionRow()
            .addComponents(button1, button2, button3, button4);

        let title = (user.ticket.getTitle() === undefined) ? "not filled" : user.ticket.getTitle();
        let description = (user.ticket.getDescription() === undefined) ? "not filled" : user.ticket.getDescription();
        let text_message = `Title: ${title}\nDescription: ${description}\n\nClick on the desired button to fill`;

        data.message.channel.send(text_message, row);
    }

    this.postTicketTitle = function (data, user) {
        data.message.reply("Excellent. Enter title");
        user.setStatus(Status.CREATE_TICKET_TITLE)
    }
    this.postTicketDescription = function (data, user) {
        data.message.reply("So. Enter text in more detail");
        user.setStatus(Status.CREATE_TICKET_DESCRIPTION)
    }

    this.answerTicket = async function (data, user, ticket_id, message_text, db, current_ticket) {
        await addMessageInTicket(data, user, ticket_id, data.message.content, db, current_ticket);
    }

}