const Facsimile = require('..');
const test = require('ava');

const { link, consistent } = require('./util');

test('Root change event', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    const server_values = [1, 2, 3];
    server.on('root_changed', store => {
        test.truthy(store === server_values.shift(), 'Proper value returned');
    });

    const client_values = [1, 2, 3];
    client.on('root_changed', store => {
        test.truthy(store === client_values.shift(), 'Proper value returned');
    });

    server.store = 1;
    server.store = 2;
    server.store = 3;

    await idle();

    test.truthy(server_values.length === 0, 'All events fired');
    test.truthy(client_values.length === 0, 'All events fired');
});

test('Ready event', async test => {
    const server = new Facsimile('a');
    server.send = () => null;
    server.store = [[[1], 2], 3];

    const client = new Facsimile('b');
    const idle = link(server, client);

    let ready = false;
    client.on('ready', store => {
        ready = true;
        consistent(client, server);

        test.truthy(store === client.store, 'Returned a store variable');
    });

    client.sync();
    await idle();

    test.truthy(ready, 'Ready fired');
});

test('Global state changes (replace)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = [];

    await idle();

    let server_events = 0,
        client_events = 0;

    server.on('change', (target) => {
        server_events++;
        test.truthy(target === server.store, 'Store was the target');
    });

    client.on('change', (target) => {
        client_events++;
        test.truthy(target === client.store, 'Store was the target');
    });

    server.store.push(1);

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});


test('Global state changes (in-replace)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = [];

    await idle();
    await server.lock(server.store);

    let server_events = 0,
        client_events = 0;

    server.on('change', target => {
        server_events++;
        test.truthy(target === server.store, 'Store was the target');
    });

    client.on('change', target => {
        client_events++;
        test.truthy(target === client.store, 'Store was the target');
    });

    server.store.push(1);

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Global state changes (property)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.on('change', (target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.on('change', (target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    server.store.a = 1;
    server.store.a = 1; // Should not fire twice

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Global state changes (delete)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.on('change', (target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.on('change', (target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    delete server.store.a;
    delete server.store.a; // Should not fire twice

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Object mutation (property)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.store.on((target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.store.on((target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    server.store.a = 1;
    server.store.a = 1; // Should not fire twice

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Object mutation (delete)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.store.on((target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.store.on((target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    delete server.store.a;
    delete server.store.a; // Should not fire twice

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});


test('Property mutation (property)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.store.on('a', (target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.store.on('a', (target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    server.store.a = 1;
    server.store.a = 1; // Should not fire twice
    server.store.b = 1;

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Property mutation (delete)', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9, b: 9 };

    await idle();

    let server_events = 0,
        client_events = 0;

    server.store.on('a', (target, property) => {
        server_events++;
        test.truthy(target === server.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    client.store.on('a', (target, property) => {
        client_events++;
        test.truthy(target === client.store, 'target was correct');
        test.truthy(property === 'a', 'property name was correct');
    });

    delete server.store.a;
    delete server.store.a; // Should not fire twice
    delete server.store.b;

    await idle();

    test.truthy(server_events === 1, 'Proper number of events fired');
    test.truthy(client_events === 1, 'Proper number of events fired');
});

test('Remove object listener', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    const listener = () => test.fail('Event should not fire');

    server.store.on(listener);
    server.store.off(listener);
    client.store.on(listener);
    client.store.off(listener);

    server.store.a = 1;

    await idle();

    test.pass('Events did not fire');
});

test('Remove property listener', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = { a: 9 };

    await idle();

    const listener = () => test.fail('Event should not fire');

    server.store.on('a', listener);
    server.store.off('a', listener);
    client.store.on('a', listener);
    client.store.off('a', listener);

    server.store.a = 1;

    await idle();

    test.pass('Events did not fire');
});
