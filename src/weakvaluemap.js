function isRef(ref) {
    return typeof ref === "object" && ref !== null;
}

class WeakValueMap extends Map {
    set(key, value) {
        if (!isRef(key)) {
            super.set(key, value);
            return ;
        }

        for (const refKey of super.keys()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref === key) {
                    super.set(refKey, value);
                    return ;
                } else if (!deref) {
                    super.delete(refKey);
                }
            }
        }

        super.set(new WeakRef(key), value);
    }

    get(key) {
        if (!isRef(key)) {
            return super.get(key);
        }

        for (const [refKey, value] of super.entries()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref === key) {
                    return value;
                } else if (!deref) {
                    super.delete(deref);
                }
            }
        }
    }

    has(key) {
        if (!isRef(key)) {
            return super.has(key);
        }

        for (const refKey of super.keys()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref === key) {
                    return true;
                } else if (!deref) {
                    super.delete(deref);
                }
            }
        }

        return false;
    }

    delete(key) {
        if (!isRef(key)) {
            super.delete(key);
            return ;
        }

        for (const refKey of super.keys()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref === key || !deref) {
                    super.delete(refKey);
                    return ;
                }
            }
        }
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    *entries() {
        for (const [refKey, value] of super.entries()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref) {
                    yield [deref, value];
                } else {
                    super.delete(refKey);
                }
            } else {
                yield [refKey, value];
            }
        }
    }

    *keys() {
        for (const refKey of super.keys()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref) {
                    yield deref;
                } else {
                    super.delete(refKey);
                }
            } else {
                yield refKey;
            }
        }
    }

    forEach(callbackFn, that = null) {
        for (const [refKey, value] of super.entries()) {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref) {
                    callbackFn.call(that, value, deref, that);
                } else {
                    super.delete(refKey);
                }
            } else {
                callbackFn.call(that, value, refKey, that);
            }
        }
    }
}

module.exports = { WeakValueMap };
