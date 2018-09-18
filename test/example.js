const Facsimile = require('..');

class Network {
	constructor () {
		this._nodes = [];
	}

	add (source) {
		this._nodes.push(source);
		source.send = (message, payload) => this.send(source, message, payload);
	}

	send (source, message, payload)	{
		for (let target of this._nodes) {
			if (target === source) continue ;

			console.log(source._hostname, message, payload);
			target.receive(message, payload);
		}
	}
}

const network = new Network();

// Create our host network
const a = new Facsimile("host");
network.add(a);
a.store = { elements: [1, 2, 3] };

a.store.elements.on(0, (target, property, new_value) => {
	console.log(`Index[0] = ${new_value}`);
});
a.store.elements.on((target, property, new_value) => {
	console.log(`Index[${property}] = ${new_value}`);
});

// Create a subnode, and syncronize them
const b = new Facsimile("client");
network.add(b);
b.on('root_changed', () => {
	console.log("Root element has changed.");
});

async function arrayFunctions() {
	const array = b.store.elements;

	console.log("Locking")
	await array.lock();
	console.log("Locked")

	console.log("Trying to create a dead lock");
	try {
		await b.store.elements.lock();	// This will fail because A owns the lock
	} catch (e) {
		console.log(e);
	}

	b.store.elements[0] = 999;
	b.store.elements[1] = 888;
	b.store.elements.unshift(4);
	b.store.elements.sort((a, b) => (a - b));

	console.log("Unlocking");
	array.release();

	console.log("Waiting for unlock");
	await a.store.elements.available;

	console.log("Locking")
	await a.store.elements.lock();
	console.log("Unlocking")
	a.store.elements[2] = 123;
	a.store.elements.release();
}

b.on('ready', () => {
	console.log("elements =", b.store.elements);
	arrayFunctions()
});

b.sync();
