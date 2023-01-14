function isRef(ref) {
    return typeof ref === "object" && ref !== null;
}

class WeakValueMap extends Map {
    set(key, value) {
        if (!isRef(key)) {
            super.set(key, value);
        } else {
            super.set(new WeakRef(key), value);
        }
    }

    get(key) {
        if (!isRef(key)) {
            return super.get(key);
        }

        for (let [refKey, value] of super.entries()) {
            if (isRef(refkey)) {
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

        for (let [refKey, ] of super.entries()) {
            if (isRef(refkey)) {
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

        for (let [refKey, ] of super.entries()) {
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
        for (let [refKey, value] of super.entries()) {
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

    keys() {
        return super.keys().reduce((acc, refKey) => {
            if (isRef(refKey)) {
                const deref = refKey.deref();

                if (deref) acc.push(deref);
            } else {
                acc.push(refKey);
            }

            return acc;
        }, []);
    }
}

module.exports = { WeakValueMap };
