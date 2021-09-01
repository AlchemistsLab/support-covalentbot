const Ticket = require("./Ticket");
module.exports = class Database {
    constructor(pool) {
        this._pool = pool
    }

    async getAllTickets(status) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query("SELECT * FROM tickets WHERE status=? ORDER BY id DESC LIMIT 25;", [status], async function (error, results) {
                resolve(results);
            });
        });
    }

    async getCountTickets(status) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query('SELECT COUNT(*) as data FROM tickets WHERE status= ?', [status], function (error, results, fields) {
                resolve(results[0].data);
            });
        });
    }

    async getCountTicketsCorrectRole(status, role) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query('SELECT COUNT(*) as data FROM tickets WHERE status = ? AND role = ?', [status, role], function (error, results, fields) {
                resolve(results[0].data);
            });
        });
    }

    async getAllTicketsCorrectRole(status, role) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query("SELECT * FROM tickets WHERE status=? AND role=? ORDER BY id DESC LIMIT 25;", [status, role], async function (error, results) {
                resolve(results);
            });
        });
    }

    async getName(discord_id) {
        const _pool = this._pool;
        return await new Promise((resolve_name, reject) => {
            _pool.query("SELECT * FROM users WHERE discord_id=? LIMIT 1;", [discord_id], async function (error, results) {
                if (error) throw error;
                if (results.length > 0) {
                    resolve_name(results[0].name);
                } else {
                    resolve_name(undefined);
                }
            });
        });
    }

    async getDataMessage(message_id) {
        const _pool = this._pool;
        return await new Promise((resolve_message, reject) => {
            _pool.query("SELECT message,discord_id FROM messages WHERE id=? LIMIT 1;", [message_id], async function (error, results) {
                resolve_message(results[0]);
            });
        });
    }

    async getOfflineTicket(ticket_id) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query("SELECT * FROM tickets WHERE id=?;", [ticket_id], async function (error, results) {
                if (error) throw error;

                const ticket = new Ticket(undefined);
                ticket.owner = undefined;
                ticket.ownerDiscordID = results[0].discord_id;
                ticket.title = results[0].title;
                ticket.messages_numbers = results[0].description.split(",");
                ticket.status = results[0].status;
                ticket.date_created = results[0].date_created;
                ticket.date_closed = results[0].date_closed;
                ticket.username = results[0].username;
                ticket.role = results[0].role;

                resolve(ticket);
            });

        });

    }

    async getRole(discord_id) {
        return await new Promise((resolve, reject) => {
            this._pool.query('SELECT role FROM users WHERE discord_id=?', [discord_id], function (error, results) {
                if (error) throw error;
                if (results.length > 0) {
                    resolve(results[0].role)
                } else {
                    resolve("user");
                }
            });
        });
    }


    async createTicket(/*Ticket*/ ticket) {
        const user = ticket.owner;
        const date = new Date()
        this._pool.query('INSERT INTO tickets SET ?', {discord_id: user.getDiscordID(), username: user.username, title: ticket.title, description: ticket.messages_numbers, status: 'PENDING', date_created: date.toLocaleDateString() + " " + date.toLocaleTimeString(), date_closed: '-', answered: '-', role: 'admin'}, function (error, results) {
            if (error) throw error;
        });
    }


    async getLastCreatedTicketId(user) {
        const _pool = this._pool;
        return await new Promise((resolve, reject) => {
            _pool.query("SELECT id FROM tickets WHERE discord_id=? AND status='PENDING' ORDER BY id DESC LIMIT 1;", [user.getDiscordID()], async function (error, results) {
                if (error) throw error;
                resolve(results[0].id);
            });
        });
    }

    async updateTicket(ticket_id, ticket) {
        for (let i = 0; i < ticket.messages_numbers.length; i++) {
            ticket.description = (i+1 !== ticket.messages_numbers.length) ?
                ticket.description += ticket.messages_numbers[i] + "," :
                ticket.description += ticket.messages_numbers[i];
        }

        const _pool = this._pool;
        const sql = "UPDATE tickets t SET " +
            "t.discord_id = ?, " +
            "t.title = ?, " +
            "t.description = ?, " +
            "t.status = ?, " +
            "t.date_created = ?, " +
            "t.date_closed = ?, " +
            "t.answered = ? ," +
            "t.role = ? " +
            "WHERE t.id = ?";
        _pool.query(sql, [ticket.ownerDiscordID, ticket.title, ticket.description, ticket.status, ticket.date_created, ticket.date_closed, ticket.answered, ticket.role, ticket_id], async function (error) {
            if (error) throw error;
        });
    }

    async createMessageID(user, message) {
        this._pool.query('INSERT INTO messages SET ?', {discord_id: user.getDiscordID(), message: message}, function (error) {
            if (error) console.log(error)
        });
        return await new Promise((resolve, reject) => {
            this._pool.query('SELECT id FROM messages WHERE discord_id=? ORDER BY id DESC LIMIT 1;', [user.getDiscordID()], function (error, results) {
                if (error) throw error;
                const message_id = results[0].id;
                resolve(message_id);
            });
        });
    }
}