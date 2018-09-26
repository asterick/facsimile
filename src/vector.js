const MAXIMUM_INT = 0x7FFFFFFF;

class Vector {
    static create(hostname) {
        return [ hostname, 0 ];
    }

    static compare(a, b) {
        if (a === undefined) {
            return true;
        } else if (b === undefined) {
            return false;
        }

        if (a.length !== b.length) {
            return a.length < b.length;
        }

        for (let i = a.length - 1; i >= 0; i--) {
            if (a[i] < b[i]) return true;
            if (a[i] > b[i]) return false;
        }
    }

    static increment_set(array, hostname) {
        if (!array || array.length === 0) {
            return Vector.create(hostname);
        }

        const max = array.reduce((a, b) => (Vector.compare(a, b) ? b : a));

        return Vector.increment(max, hostname);
    }

    static increment(a, hostname) {
        if (a === undefined) {
            return Vector.create(hostname);
        }

        const n = [hostname].concat(a.slice(1));

        for (let i = 1; ; i++) {
            if (n[i] < MAXIMUM_INT) {
                n[i]++;
                return n;
            } else if (n[i] === undefined) {
                n[i] = 0;
                return n;
            }

            n[i] = 0;
        }
    }
}

module.exports = Vector;
