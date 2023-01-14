const { ObjectReference } = require("./object.js");

class Facsimile {
    constructor(hostname) {
        if (/[^\w.\-]/.exec(hostname)) {
            throw new Error("Hostname may only contain: Latin letters, numbers, periods, underscores and dashes");
        }

        this._hostname = hostname;
        this._id_by_object = new Map();
        this._object_by_id = new WeakMap();
        this._top = new ObjectReference();
    }

    get state() {
        return this._top.proxy;
    }
}

module.exports = Facsimile;
