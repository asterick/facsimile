const Facsimile = require('..');
const test = require('ava');
const { forTime } = require('./util');

test('Basic exception handling', test => {
    const server = new Facsimile('a');

    const error = test.throws(() => {
        server.store = {};
    }, Error, 'Should throw an error when using a base store');

    test.truthy(error.message === 'This object does not have support signalling');
});

test('Store may be a value type', test => {
    const value = 0xDEADCAFE;

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    server.store = value;

    test.deepEqual(client.store, value, 'Values are deeply equal');
});

test('Store can be a reference type', test => {
    const value = { a: 1, b: 2, c: 3 };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    server.store = value;

    test.deepEqual(client.store, value, 'Values are deeply equal');
});

test('Store can be an array type', test => {
    const value = [ 1, 2, 3 ];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    server.store = value;

    test.deepEqual(client.store, value, 'Values are deeply equal');
    test.truthy(Array.isArray(client.store));
});

test('Store can store nested references', test => {
    const value = {
        a: [ 1, 2, 3, { x: 7, y: 8, z: 9 }],
        b: { r: 0.5, g: 0.25, b: 0.75 }
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    server.store = value;
    test.deepEqual(client.store, value, 'Values are deeply equal');
});


test('Store can store circular references', test => {
    const value = {
        a: 999
    };

    value.reference = value;

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    server.store = value;

    test.truthy(client.store.reference !== undefined, 'Reference was created');
    test.truthy(client.store.reference === client.store.reference.reference, 'Reference is circular');
    test.truthy(client.store.reference.reference.a === 999, 'Reference contains data');
});

test('Sync rebuilds complex structures', test => {
    const value = {
        a: [ 1, 2, 3, { x: 7, y: 8, z: 9 }],
        b: { r: 0.5, g: 0.25, b: 0.75 }
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    server.send = () => null;   // Prevent errors
    server.store = value;

    // Signal forwarding
    server.send = (... args) => client.receive(... args);
    client.send = (... args) => server.receive(... args);

    // Sync the references
    client.sync();

    test.deepEqual(client.store, value, 'Values are deeply equal');
});

test('Messaging is network transmissible', test => {
    const value = {
        a: [ 1, 2, 3, { x: 7, y: 8, z: 9 }],
        b: { r: 0.5, g: 0.25, b: 0.75 }
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    server.send = () => null;   // Prevent errors
    server.store = value;

    // Signal forwarding
    server.send = (... args) => client.receive(... JSON.parse(JSON.stringify(args)));
    client.send = (... args) => server.receive(... JSON.parse(JSON.stringify(args)));

    // Sync the references
    client.sync();

    test.deepEqual(client.store, value, 'Values are deeply equal');
});

test('Can edit values inline', test => {
    const value = {
        r: 0, g: 0
    };
    const final = {
        r: 1, b: 3
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... JSON.parse(JSON.stringify(args)));
    client.send = (... args) => server.receive(... JSON.parse(JSON.stringify(args)));

    // Mess with our store
    server.store = value;
    server.store.r = 1;
    delete server.store.g;
    server.store.b = 3;

    test.deepEqual(client.store, final, 'Values are deeply equal');
});

test('Highest host wins', async test => {
    const value = {
        r: 0, g: 0, b: 0
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding (same amount of time between)
    server.send = (... args) => setTimeout(() => client.receive(... args), 0);
    client.send = (... args) => setTimeout(() => server.receive(... args), 0);

    // Mess with our store
    server.store = value;

    await forTime(5);

    test.deepEqual(client.store, value, 'Values are deeply equal');

    // Client has a higher hostname, so it should win the fight
    server.store.r = 100;
    client.store.r = 200;

    await forTime(5);

    test.truthy(server.store.r === client.store.r, 'Values should be the same');
    test.truthy(server.store.r === 200, 'Client should have won conflict');
});

test('Object assign should work', async test => {
    const final = {
        r: 1, b: 3
    };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    // Signal forwarding
    server.send = (... args) => client.receive(... JSON.parse(JSON.stringify(args)));
    client.send = (... args) => server.receive(... JSON.parse(JSON.stringify(args)));

    server.store = {};

    // Mess with our store
    Object.assign(server.store, final);
    test.deepEqual(client.store, final, 'Values are deeply equal');
});
