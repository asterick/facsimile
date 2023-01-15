const { ObjectReference } = require("./object.js");
const { WeakValueMap } = require("./weakvaluemap.js");

class Facsimile {
    constructor(hostname) {
        if (/[\x00-\x20]/.exec(hostname)) {
            throw new Error("Hostname may not contain spaces or lower ASCII characters");
        }

        this._hostname = hostname;
        this._top = null;

        this._id_by_object = new WeakMap();
        this._object_by_id = new WeakValueMap();

        Object.seal(this);
    }

    register(guid, object) {
        // Newly discovered object
        if (this._object_by_id.get(guid) !== this) {
            this._send('new', { guid, type: Array.isArray(object._storage) ? 'array' : 'object'});
        }

        // Lookup by Proxy, it's host container and it's underlying storage
        this._id_by_object.set(object, guid);
        this._id_by_object.set(object.proxy, guid);
        this._id_by_object.set(object._storage, guid);

        // Locate host container by ID
        this._object_by_id.set(guid, object);
    }

    locate(object) {
        const guid = this._id_by_object.get(object);

        if (guid) {
            return this._object_by_id.get(guid);
        }

        // Discovered a new object, we should register and serialize it
        const ref = ObjectReference.from(this, object);
        ref._reset();
        return ref;
    }

    networkIdentity(value) {
        if (typeof value === 'object' && value !== null) {
            return [ this.locate(value)._guid ]
        } else {
            return value;
        }
    }

    get state() {
        if (typeof this._top === 'object' && this._top !== null) {
            return this.locate(this._top).proxy;
        } else {
            return this._top;
        }
    }

    set state(value) {
        this._top = value;
        this._send('root', { value: this.networkIdentity(value) });
    }

    // Private members
    _send (op, rest) {
        const output = {
            op,
            hostname: this._hostname,
            ... rest
        };

        // TODO:
    }

    _receive (message) {
        if (message.guid) {
            // TODO: Handle objects with which I do not know
            // Should never happen if we sync first thing

            this._object_by_id.get(message.guid)._receive(message);
        }

        // TODO
    }
}

module.exports = { Facsimile };
