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

	static increment(a, hostname) {
		const n = a.slice(0, -1);

		if (!a) {
			return [ 0, hostname ];
		}

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
