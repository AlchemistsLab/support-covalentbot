const User = require("./User.js");
module.exports = class UserManager {
    users = {};
    ticket = undefined;

    createUser(discord_id, username) {
        this.users[discord_id] = new User(discord_id, username);
        return this.users[discord_id];
    }
    containsUser(discord_id) {
        return this.users.hasOwnProperty(discord_id);
    }
    getUser(discord_id) {
        return this.users[discord_id];
    }
}