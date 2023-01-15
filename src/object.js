const RESET_CALLS = new Set([
    Array.prototype.sort
]);

class ObjectReference {
    constructor(parent, storage, guid = `${parent._hostname} ${crypto.randomUUID()}`) {
        this._guid = guid;
        this._vectors = Array.isArray(storage) ? [] : {};
        this._parent = parent;
        this._storage = storage;
        this._lock = null;
        this._proxy = new Proxy(this._storage, this);
        Object.freeze (this);

        for (const key of Object.keys(storage)) {
            this._vectors[key] = [0, parent._hostname];
        }

        parent.register(guid, this);
    }

    static as(parent, type, id) {
        return new ObjectReference(parent, new type, id);
    }

    static from(parent, object, id) {
        if (typeof object !== 'object' || object === null) {
            return object;
        } else if (Object.getPrototypeOf(object) !== Array.prototype &&
            Object.getPrototypeOf(object) !== Object.prototype) {
            throw new Error("Can only coerse basic objects and arrays to object reference");
        }

        return new ObjectReference(parent, object, id);
    }

    get proxy() {
        return this._proxy;
    }

    // Private members
    _increment(key) {
        const newVector = this._vectors[key][0] + 1 || 0;
        this._vectors[key] = [newVector, this._parent._hostname];
        return newVector;
    }

    _serialize () {
        if (Array.isArray(this._storage)) {
            return this._storage.map((v) => this._parent.networkIdentity(v));
        } else {
            const result = {};
            for (const [key, value] of Object.entries(this._storage)) {
                result[key] = this._parent.networkIdentity(value);
            }
            return result;
        }
    }

    _reset () {
        let vector = 0;

        for (const [index] in Object.values(this._vectors)) {
            if (index > vector) vector = index;
        }

        this._parent._send('init', {
            guid: this._guid,
            vector,
            value: this._serialize()
        });
    }

    _send (op, key, data) {
        const vector = this._increment(key);
        this._parent._send(op, { guid: this._guid, vector, key, ... data })
    }

    _receive (message) {
        // TODO
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
        const that = this;

        if (typeof value === 'function') {
            return function (... rest) {
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
                    }
                }

                value.apply(storage, rest);

                if (RESET_CALLS.has(value)) {
                    this._reset();
                } else {
                    that._send('call', key, { values: rest })
                }
            }
        } else if (typeof value === 'object' && object !== null) {
            return this._parent.locate(value).proxy;
        } else {
            return value;
        }
    }

    set (storage, key, value, that) {
        console.log(key, value);
        this._storage[key] = value;
        this._send('set', key, { value: this._parent.networkIdentity(value) });
    }

    deleteProperty (storage, key) {
        switch (typeof this._storage[key]) {
            case 'undefined':
            case 'function':
                return ;
            default:
                this._send('delete', key);
                delete this._storage[key];
        }
    }
}

module.exports = { ObjectReference };
