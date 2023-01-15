function isRef(ref) {
    return typeof ref === "object" && ref !== null;
}

class WeakValueMap extends Map {
    set(key, value) {
        if (isRef(value)) {
            value = new WeakRef(value);
        }

        return super.set(key, value);
    }

    get(key) {
        const value = super.get(key);

        if (!isRef(value)) {
            return value;
        }

        const deref = value.deref();

        if (deref) {
            return deref;
        } else if (!deref) {
            super.delete(key);
        }
    }

    has(key) {
        const value = super.get(key);

        if (!isRef(value)) {
            return super.has(key);
        }

        const deref = value.deref();

        if (!deref) {
            super.delete(key);
            return false;
        }

        return true;
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *entries() {
        for (const [key, refValue] of super.entries()) {
            if (isRef(refValue)) {
                const deref = refValue.deref();

                if (deref) {
                    yield [key, deref];
                } else {
                    super.delete(key);
                }
            } else {
                yield [key, refValue];
            }
        }
    }

    *values() {
        for (const [key, value] of this) {
            yield value;
        }
    }

    forEach(callbackFn, that = null) {
        for (const [key, value] of this) {
            callbackFn.call(that, value, key, this);
        }
    }
}

module.exports = { WeakValueMap };
