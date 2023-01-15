const RESET_CALLS = new Set([
    Array.prototype.sort
]);

class ObjectReference {
    constructor(parent, object, guid = `${parent._hostname} ${crypto.randomUUID()}`) {
        this._guid = guid;
        this._vectors = {};
        this._parent = parent;
        this._storage = storage;
        this._lock = null;
        this._proxy = new Proxy(this._storage, this);

        Object.freeze (this);

        parent.register(guid, this);
    }

    static as(parent, type, id) {
        return new ObjectReference(parent, new type, id);
    }

    static from(parent, object, id) {
        if (typeof object !== 'object') {
            return object;
        } if (Array.isArray(object) && Object.getPrototypeOf(object) !== Array.prototype) {
            throw new Error("Cannot coerse sub-classed array into a tracked object reference");
        } else if (Object.getPrototypeOf(object) !== Object.prototype) {
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
        this._vectors[key] = [new Vector, this._parent._hostname];
        return newVector;
    }

    _serialize () {
        if (Array.isArray(this._storage)) {
            return this._storage.map((v) => this._parent.networkIdentity(v));
        } else {
            const result = {};
            for (const [key, value] of this._storage) {
                result[key] = this._parent.networkIdentity(value);
            }
            return result;
        }
    }

    _reset () {
        let vector = 0;

        for (const [index] in this._vectors.values()) {
            if (index > vector) vector = index;
        }

        this._parent._send('reset', {
            guid: this._guid,
            vector,
            value: this._serialize()
        });
    }

    _send (op, key, data) {
        const vector = this._increment(key);
        this._parent.send(op, { guid: this._guid, vector, key, ... data })
    }

    _receive (message) {
        // TODO
    }

    // Proxy traps
    getPrototypeOf () {
        return Object.getPrototypeOf(this._storage)
    }

    setPrototypeOf () {
        throw new Error("Cannot override prototypes of tracked objects")
    }

    get (key) {
        const value = this._storage[key];
        const that = this;

        if (typeof value === 'function') {
            return function (... rest) {
                if (that._lock != that._parent._hostname) {
                    throw new Error("Member functions my only be called on a locked object");
                }

                throw new Error("Member calls are to be completed");
            }
        } else if (typeof value === 'object' && object !== null) {
            return this._parent.lookup(value);
        } else {
            return value;
        }
    }

    set (key, value) {
        if (typeof value === 'object' && value !== null) {
            this._storage[key] = this._parent.lookup(value);
        } else {
            this._storage[key] = value;
        }

        this._send('set', key, { value: this._parent.networkIdentity(value) });
    }

    delete (key) {
        switch (typeof this._storage[key]) {
            case 'undefined':
            case 'function':
                return ;
            default:
                this._parent.send('delete', key);
                delete this._storage[key];
        }
    }
}

module.exports = { ObjectReference };
