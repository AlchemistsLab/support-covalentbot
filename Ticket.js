module.exports = class Ticket {
    constructor(owner) {
        this.owner = owner;
        this.messages_numbers = [];
        this.description = "";
        this.answered = "";
        this.role = "admin";
    }
    get title() {
        return this._title;
    }
    set title(title) {
        this._title = title;
    }

    get ownerDiscordID() {
        return this._ownerDiscordID;
    }
    set ownerDiscordID(ownerDiscordID) {
        this._ownerDiscordID = ownerDiscordID;
    }

    get date_created() {
        return this._date_created;
    }
    set date_created(date_created) {
        this._date_created = date_created;
    }

    get date_closed() {
        return this._date_closed;
    }
    set date_closed(date_closed) {
        this._date_closed = date_closed;
    }

    addTextInDescription(message) {
        this.description += message;
    }

    clearDescription() {
        this.description = "";
    }

    addMessageID(message_id) {
        this.messages_numbers.push(message_id);
    }

    clearMessageIDs() {
        this.messages_numbers = [];
    }

    get status() {
        return this._status;
    }
    set status(status) {
        this._status = status;
    }
}