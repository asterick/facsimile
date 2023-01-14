const { guid } = require("./guid");

class ObjectReference {
    constructor(parent, object, id = guid()) {
        this._vectors = new Map();
        this._parent = parent;
        this._storage = storage;
        this._proxy = new Proxy(this._storage, this);

        Object.freeze (this);

        parent.register(id, this);
    }

    static as(parent, type, id) {
        return new ObjectReference(parent, new type, id);
    }

    static from(parent, object, id) {
        if (Array.isArray(object) && Object.getPrototypeOf(object) !== Array.prototype) {
            throw new Error("Cannot coerse sub-classed array into a tracked object reference");
        } else if (Object.getPrototypeOf(object) !== Object.prototype) {
            throw new Error("Can only coerse basic objects and arrays to object reference");
        }

        const ref = new ObjectReference(parent, object, id);
    }

    get proxy() {
        return this._proxy;
    }

    // Proxy traps
    setPrototypeOf() {
        throw new Error("Cannot assign new ")
    }

    get() {
        // TODO: HOOK ARRAY FUNCTIONS
    }

    set() {

    }

    delete() {

    }
}

module.exports = { ObjectReference };
