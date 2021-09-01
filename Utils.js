module.exports = class Utils {
    cut(str) {
        if (str.length > 25) {
            let new_str = str.slice(0,23);
            new_str += "..";
            return new_str;
        }
        return str;
    }
}