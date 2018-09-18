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

b.on('ready', () => {
	console.log("elements =", b.store.elements);

	b.store.elements[0] = 999;
	b.store.elements[1] = 888;
	a.store.elements.unshift(4);
	a.store.elements.sort((a, b) => (a - b));
});

b.sync();
