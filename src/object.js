const RESET_CALLS = new Set([
    Array.prototype.sort
]);

class ObjectReference {
    constructor(parent, object, guid = ObjectReference.guid()) {
        this._guid = guid;
        this._vectors = {};
        this._parent = parent;
        this._storage = storage;
        this._proxy = new Proxy(this._storage, this);

        Object.freeze (this);

        parent.register(guid, this);
    }

    static guid() {
        console.log("!!!");
        return `${this._parent._hostname} ${crypto.randomUUID()}`
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
    _send(op, key, args) {
        const [index] = this._vectors[key] || [-1];
        const vector = [index+1, this._parent._hostname];

        this._parent.send({
            op,
            vector,
            ... args
        })
    }

    _serialize () {
        // TODO: Create a network safe copy of the stored value
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

        if (RESET_CALLS.has(value)) {
            return function (... rest) {
                const ret = value.apply(this, rest);
                this._parent.send('reset', key, this._serialize());
            }
        } if (typeof value === 'function') {
            return function (... rest) {
                const ret = value.apply(this, rest);
                this._parent.send('reset', key, this._serialize());
            }
        } else if (typeof value === 'object' && object !== null) {
            return this._parent.lookup(value);
        } else {
            return value;
        }
    }

    set (key, value) {

    }

    delete (key) {
        switch (typeof this._storage[key]) {
            case 'undefined':
            case 'function':
                return ;
            default:
                this._parent.send('delete', this._id, key);
                delete this._storage[key];
        }
    }
}

module.exports = { ObjectReference };
