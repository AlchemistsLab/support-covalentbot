function isPermissions() {

}

function showTickets(data, db, typeTicket) {
    let select = new data.addonMessage.MessageMenu()
        .setID('tickets_' + typeTicket)
        .setPlaceholder('View tickets' + typeTicket)

    db.all(`SELECT * FROM tickets WHERE status='${typeTicket}' ORDER BY id`, function (err, rows) {
        if (!err) {
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
            if (rows.length > 0) {
                data.message.channel.send('Ticket menu', select);
            } else {
                data.message.reply("There are no tickets.");
            }

        } else{
            console.log(err);
        }
    });


    // let select = new data.addonMessage.MessageMenu()
    //     .setID('tickets_' + typeTicket)
    //     .setPlaceholder('Посмотреть тикеты ' + typeTicket)
    //             let option = new data.addonMessage.MessageMenuOption()
    //                 .setLabel(`lalala`)
    //                 .setValue(`ohoho`)
    //                 .setDescription(`123123`)
    // select.addOption(option);
    // data.message.channel.send('Тикетоски', select);
}

module.exports = function () {

    this.showTickets = function (data, db, typeTicket) {
        showTickets(data, db, typeTicket)
    }


    this.execute = function (data, discord_id, db) {
        let btn1 = new data.addonMessage.MessageButton()
            .setStyle('blurple')
            .setLabel('View tickets WAITTING')
            .setID('btnShowTicket_WAITTING')

        let btn2 = new data.addonMessage.MessageButton()
            .setStyle('green')
            .setLabel('View tickets ANSWERED')
            .setID('btnShowTicket_ANSWERED')


        let btn3 = new data.addonMessage.MessageButton()
            .setStyle('red')
            .setLabel('View tickets CLOSED')
            .setID('btnShowTicket_CLOSED')

        let row = new data.addonMessage.MessageActionRow()
            .addComponents(btn1, btn2, btn3);

        data.message.channel.send('Select the component you want', row);
    }
}