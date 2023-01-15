const { ObjectReference } = require("./object.js");
const { WeakValueMap } = require("./weakvaluemap.js");

class Facsimile {
    constructor(hostname) {
        if (/[\x00-\x20]/.exec(hostname)) {
            throw new Error("Hostname may not contain spaces or lower ASCII characters");
        }

        this._hostname = hostname;
        this._top = null;

        this._id_by_object = new WeakValueMap();
        this._object_by_id = new WeakMap();

        Object.freeze(this);
    }

    register(object, guid) {
        this._id_by_object.set(object, guid);
        this._id_by_object.set(object.proxy, guid);
        this._object_by_id.set(guid, object);
    }

    lookup(object) {
        return this._id_by_object.set(object);
    }

    get state() {
        return this._top.proxy;
    }

    set state(value) {
        // OVERRIDE THE GLOBAL OBJECT
    }

    send (message) {
        console.log(message)
    }

    receive (message) {
        // TODO
    }

    // TOOD: REGISTER CONSUMERS
}

module.exports = Facsimile;
