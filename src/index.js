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
        if (this._object_by_id.get(guid) !== this) {
            this.send('new', { guid, type: Array.isArray(object._storage) ? 'array' : 'object'});
        }

        this._id_by_object.set(object, guid);
        this._id_by_object.set(object.proxy, guid);
        this._object_by_id.set(guid, object);
    }

    lookup(object) {
        const obj = this._id_by_object.set(object);

        if (obj !== undefined) {
            return obj;
        }

        // Discovered a new object, we should register and serialize it
        const ref = ObjectReference.from(this, object);
        ref._reset();

        return ref;
    }

    networkIdentity(value) {
        if (typeof value === 'object' && value !== null) {
            return [this.lookup(value)]
        } else {
            return value;
        }
    }

    get state() {
        if (typeof this._top === 'object' && this._top !== null) {
            return this._top.proxy;
        } else {
            return this._top;
        }
    }

    set state(value) {
        this._top = value;
        this.send('root', { id: this.networkIdentity(value) });
    }

    _send (op, rest) {
        const output = {
            op,
            hostname: this._hostname,
            ... rest
        };

        console.log(output);
    }

    _receive (message) {
        if (message.guid) {
            // TODO: Handle objects with which I do not know
            // Should never happen if we sync first thing

            this._object_by_id.get(message.guid)._receive(message);
        }

        console.log(message)
    }
}

module.exports = Facsimile;
