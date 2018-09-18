class Vector {
	static create(hostname) {
		return [ 0, hostname ];
	}

	static compare(a, b) {
		return !a || a.some((v, i) => v < b[i]);
	}

	static increment(a, hostname) {
		const n = a.slice(1, -1).concat(hostname);
		n[0]++;
		return n;
	}
}

module.exports = Vector;
