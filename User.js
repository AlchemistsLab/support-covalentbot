let Ticket = require("./Ticket.js")

module.exports = class User {
    constructor(discord_id, username) {
        this.discord_id = discord_id;
        this.username = username;
    }


    getDiscordID() {
        return this.discord_id;
    }

    getUsername() {
        return this.username;
    }

    getTicket() {
        return this.ticket;
    }

    clearTicket() {
        this.ticket = null;
    }
}