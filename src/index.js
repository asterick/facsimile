const { ObjectReference } = require("./object.js");
const { WeakValueMap } = require("./weakvaluemap.js");

class Facsimile {
    constructor(hostname) {
        if (/[\x00-\x20]/.exec(hostname)) {
            throw new Error("Hostname may not contain spaces or lower ASCII characters");
        }

        this._initialized = false;
        this._hostname = hostname;
        this._top = null;
        this._topVector = [0n, this._hostname];
        this._consumers = [];

        this._id_by_object = new WeakMap();
        this._object_by_id = new WeakValueMap();

        Object.seal(this);
    }

    addConsumer(consumer) {
        consumer.send({ op: 'hello', ... this._serialize() });
        this._consumers.push(consumer);
    }

    register(guid, object) {
        // Newly discovered object
        if (this._object_by_id.get(guid) !== this) {
            this._send('new', { guid, type: Array.isArray(object._storage) ? [] : {} });
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
        this._send('init', { guid: ref._guid, data: ref._serialize() });
        return ref;
    }

    id(value) {
        if (typeof value === 'object' && value !== null) {
            return [ this.locate(value).name ]
        } else {
            return value;
        }
    }

    *guids(values) {
        for (const value of Object.values(values)) {
            if (Array.isArray(value)) yield value;
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
        this._send('root', { vector: this._topVector, value: this.id(value) });
    }

    _serialize() {
        const root = { vector: this._topVector, value: this.id(this._top) };
        const keys = [ root.value ];
        const result = { root }

        while (keys.length > 0) {
            const next = keys.pop();

            if (!Array.isArray(next)) continue ;

            const [ key ] = next;

            if (result[key]) continue ;

            const ref = this._object_by_id.get(key);
            const data = ref._serialize();
            result[key] = { vectors: ref._vectors, data };

            keys.push(... Object.values(data));
        }

        return result;
    }

    // Private members
    _send (op, rest) {
        const message = {
            op,
            hostname: this._hostname,
            ... rest
        };

        for (const consumer of this._consumers) {
            consumer.send(message);
        }

        console.log(message);
    }

    _receive (message, source) {
        if (message.guid) {
            const obj = this._object_by_id.get(message.target)

            if (obj._receive(message)) {
                for (const consumer of this._consumers) {
                    if (consumer !== source) {
                        consumer.send(message);
                    }
                }
            }

            return ;
        }

        switch (message.op) {

        }
    }
}

module.exports = { Facsimile };
