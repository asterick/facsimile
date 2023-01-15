class ObjectReference {
    constructor(parent, storage, guid = crypto.randomUUID(), origin = parent._hostname) {
        this._origin = origin;
        this._guid = guid;
        this._vectors = Array.isArray(storage) ? [] : {};
        this._parent = parent;
        this._storage = storage;
        this._lock = null;
        this._proxy = new Proxy(this._storage, this);
        Object.seal (this);

        for (const key of Object.keys(storage)) {
            this._vectors[key] = [0n, parent._hostname];
        }

        parent.register(this.name, this);
    }

    static as(parent, type, guid, origin) {
        return new ObjectReference(parent, new type, guid, origin);
    }

    static from(parent, object, guid, origin) {
        if (typeof object !== 'object' || object === null) {
            return object;
        } else if (Object.getPrototypeOf(object) !== Array.prototype &&
            Object.getPrototypeOf(object) !== Object.prototype) {
            throw new Error("Can only coerse basic objects and arrays to object reference");
        }

        return new ObjectReference(parent, object, guid, origin);
    }

    get name() {
        return `${this._origin}:${this._guid}`
    }

    get proxy() {
        return this._proxy;
    }

    // Private members
    _serialize () {
        if (Array.isArray(this._storage)) {
            return this._storage.map((v) => this._parent.id(v));
        } else {
            const data = {};
            for (const [key, value] of Object.entries(this._storage)) {
                data[key] = this._parent.id(value);
            }
            return data;
        }
    }

    _send (op, data) {
        this._parent._send(op, { target: this.name, ... data })
    }

    _receive (message) {
        // TODO
    }

    _increment (key) {
        let id;
        if (this._vectors[key]) {
            id = this._vectors[key][0] + 1n;
        } else {
            id = 0n;
        }

        return this._vectors[key] = [id, this._parent._hostname];
    }

    // Proxy traps
    getPrototypeOf (storage) {
        return Object.getPrototypeOf(storage);
    }

    setPrototypeOf () {
        throw new Error("Cannot override prototypes of tracked objects")
    }

    get (storage, key, proxy) {
        const value = storage[key];

        if (typeof value === 'function') {
            const that = this;

            return function (... rest) {
                let requireReset = false;

                /* This is not operating on our proxy, simply apply it somewhere else */
                if (this !== proxy) {
                    return value.apply(this, rest);
                }

                /* Verify that the relevant objects are locked */
                if (that._lock !== that._parent._hostname) {
                    //throw new Error("Member functions my only be called on a locked object");
                }

                for (const value of rest) {
                    if (typeof value === 'object' && value !== null) {
                        if (this.locate(value, true)._lock !== that._parent._hostname) {
                            throw new Error("Member can only be called with locked objects");
                        }
                    } else if (typeof value === 'function') {
                        requireReset = true;
                    }
                }

                // Apply function to our object
                value.apply(storage, rest);

                // Since our array is locked, we will simply reset everything to zero as there cannot be contentions
                const vector = [0n, that._parent._hostname];
                that._vectors = Array.isArray(storage) ? [] : {}
                for (const key in Object.keys(storage)) {
                    that._vectors[key] = vector;
                }

                if (requireReset) {
                    that._send('replace', { data: that._serialize() });
                } else if (Object.getPrototypeOf(storage)[key] === value) {
                    that._send('call', { key, values: rest })
                }
            }
        } else if (typeof value === 'object' && value !== null) {
            return this._parent.locate(value).proxy;
        } else {
            return value;
        }
    }

    set (storage, key, value, that) {
        if (value === this._storage[key]) return ;

        if (typeof value === "object" && object !== null) {
            const obj = this._parent.locate(value);

            this._storage[key] = obj._storage;
        } else {
            this._storage[key] = value;
        }

        if (typeof value !== 'function') {
            this._send('set', { vector: this._increment(key), value: this._parent.id(value) });
        }
    }

    deleteProperty (storage, key) {
        switch (typeof this._storage[key]) {
            case 'undefined':
            case 'function':
                return ;
            default:
                this._send('delete', { vector: this._increment(key), key });
                delete this._storage[key];
        }
    }
}

module.exports = { ObjectReference };
