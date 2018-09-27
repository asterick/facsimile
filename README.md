# Facsimile

[![Build Status](https://travis-ci.com/asterick/facsimile.svg?branch=master)](https://travis-ci.com/asterick/facsimile)
[![Coverage Status](https://coveralls.io/repos/github/asterick/facsimile/badge.svg?branch=master)](https://coveralls.io/github/asterick/facsimile?branch=master)

> Transparent object mirroring across process boundaries, with change monitoring

## Installation

Install with [npm](https://www.npmjs.com/)

```sh
npm i --save facsimile
```

## API

Before you begin:

```js
const Facsimile = require('facsimile');
```

### new Facsimile(hostname)

Create an empty instance of a facsimile node.  Hostname is used for data conflict resolution, 
it may be any value type (string preferably), but types should not be mixed across your network

### Facsimile.store

A monitored object used to manage your state.  It can be accessed like any other object

### Facsimile.sync()

Tells the instance to flush it's state, and request syncronization data from the network

### Facsimile.lock(object):Promise

Request exclusive write permissions to an object, promise will not resolve until the lock has
been established

**NOTE: You must pass an object returned from the Facsimile.state collection**

### Facsimile.request(object):Promise

Request exclusive write permissions to an object, promise will return a failure if the lock has
already been established.

**NOTE: You must pass an object returned from the Facsimile.state collection**

### Facsimile.release(object)

Release lock on object, will throw an error if the object is not owned by host node.

**NOTE: You must pass an object returned from the Facsimile.state collection**

### Facsimile.send(message, payload)

This function must be overloaded as a part of setting up a communications pipeline.  For every
call made to this, a similar call to `Facsimile.receive` must be made in the same order as they
were dispatched

### Facsimile.receive(message, payload)

Receive syncronization data from an external Facsimile instance

## Events

### Facsimile.on('root_changed', cb)

A node has redefined the global scope object

### Facsimile.on('ready', cb)

Creates a listener that will fire any time all known lazy references have been resolved.
IE: when a `.sync()` command has completed.

### Facsimile.on('change', function(target:object, property:string, \[new:\*\],  \[old:\*\]))

An instance contained inside of the Facsimile store has changed

**NOTE: Property may be undefined if mass object change occured**

### Facsimile.store.\*.on([property:string], cb:function(target:object, property:string, \[new:\*\],  \[old:\*\]))

Monitor changes on a reference type in a `Facsimile.store`.  Can only be attached to
reference types, and will not monitor changes in contained objects.

**NOTE: Property may be undefined if mass object change occured**

### Facsimile.store.\*.off([property:string], cb:function)

Destroy an event listener created with `Facsimile.store.*.on`

## Notes on communication

Facsimile instances do not natively support any signalling between the various modules.
You must supply a tunnel between the instances, and all messages sent from one 
node must be sent to all other nodes in the system.

Caveats:
* Messages sent from a node must be relayed in order.
* How messages are interleaved between multiple nodes does not matter
* Messages are committed in 'Last Written' priority
* If the system cannot determine who wrote last, the host with the highest 'hostname' wins

## Basic local example

```js
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
	await b.lock(array);
	console.log("Locked");

	console.log("Trying to create a dead lock");
	try {
		await a.request(a.store.elements);
	} catch (e) {
		console.log("Intentional error:", e);
	}

	b.store.elements[0] = 999;
	b.store.elements[1] = 888;
	b.store.elements.unshift(4);
	b.store.elements.sort((a, b) => (a - b));

	console.log("Unlocking");
	b.release(array);
}

b.on('ready', () => {
	console.log("elements =", b.store.elements);
	arrayFunctions()
});

b.sync();
```

### Contact

**@asterick**: [Twitter](https://twitter.com/asterick) | [GitHub](https://github.com/asterick)
