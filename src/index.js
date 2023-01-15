const { ObjectReference } = require("./object.js");
const { WeakValueMap } = require("./weakvaluemap.js");

class Facsimile {
    constructor(hostname) {
        if (/[\x00-\x20]/.exec(hostname)) {
            throw new Error("Hostname may not contain spaces or lower ASCII characters");
        }

        this._hostname = hostname;
        this._top = null;
        this._topVector = [0n, this._hostname];

        this._id_by_object = new WeakMap();
        this._object_by_id = new WeakValueMap();

        Object.seal(this);
    }

    register(guid, object) {
        // Newly discovered object
        if (this._object_by_id.get(guid) !== this) {
            this._send('new', { guid, type: Array.isArray(object._storage) ? 'array' : 'object' });
        }

        // Lookup by Proxy, it's host container and it's underlying storage
        this._id_by_object.set(object, guid);
        this._id_by_object.set(object.proxy, guid);
        this._id_by_object.set(object._storage, guid);

        // Locate host container by ID
        this._object_by_id.set(guid, object);
    }

    locate(object, requireRegistered = false) {
        const guid = this._id_by_object.get(object);

        if (guid) {
            return this._object_by_id.get(guid);
        } else if (requireRegistered) {
            throw new Error("Unregistered object discovered in call tree");
        }

        // Discovered a new object, we should register and serialize it
        const ref = ObjectReference.from(this, object);
        this._send('init', ref._serialize());
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
        this._topVector = [ this._topVector[0] + 1n, this._hostname ];

        this._top = value;
        this._send('root', { vector: this._topVector, value: this.networkIdentity(value) });
    }

    // Private members
    _send (op, rest) {
        const output = {
            op,
            hostname: this._hostname,
            ... rest
        };

        console.log(output)
    }

    _receive (message) {
        // TODO:

        if (message.guid) {
            const obj = this._object_by_id.get(message.guid)

            if (obj._receive(message)) {
                // FORWARD TO OTHER CONSUMERS
            } else {
                // SYNC WITH
            }
        }

        switch (message.op) {

        }
        // TODO
    }
}

module.exports = { Facsimile };
