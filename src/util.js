const base = Date.now();

let inc;
let last_date;

function guid(hostname) {
	const date = Date.now() - base;
	if (last_date !== date) {
		inc = 0;
		last_date = date;
	}

	return `${hostname}:${date}:${inc++}`;
};

function clone(value) {
	if (Array.isArray(value)) {
		return value.map(clone);
	} else if (value !== null && typeof value === 'object') {
		return Object.keys(value).reduce((acc, key) => ((acc[key] = clone(value[key])), acc), {});
	} else {
		return value;
	}
}

module.exports = {
	guid, clone
};
