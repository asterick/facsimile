const MAXIMUM_INT = 0xFFFFFFFF;

class Vector {
	static create(hostname) {
		return [ 0, hostname ];
	}

	static compare(a, b) {
		return !a
			 || (a.length < b.length)
			 || a.some((v, i) => v < b[i]);
	}

	static bulk_increment(array, hostname) {
		const max = array.reduce((a, b) => (Vector.compare(a, b) ? b : a));

		return Vector.increment(max, hostname);
	}

	static increment(a, hostname) {
		if (!a) {
			return [ 0, hostname ];
		}

		const n = a.slice(0, -1);

		for (let i = 0; i < n.length; i++) {
			if (n[i] < MAXIMUM_INT) {
				n[i]++;
				break ;
			}
			n[i] = 0;
		}

		return n.concat(hostname);
	}
}

module.exports = Vector;
