const Facsimile = require('..');
const test = require('ava');
const { forTime, link, consistent } = require('./util');

test('Basic sort works', async test => {
    const result = [1, 2, 3, 4];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(client, server);

    server.store = [3, 1, 4, 2];
    server.store.sort((a, b) => (a - b));

    await idle();

    test.deepEqual(client.store, server.store, 'both arrays must match');
    test.deepEqual(client.store, result, 'array must have sorted');
});

test('Unlocked objects should use replace', async test => {
    const start = [1, 2, 3];
    const result = [1, 2, 3, 4];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    let called = false;

    server.send = (msg, ... args) => {
        if (msg === 'call') called = true;
        setTimeout(() => client.receive(msg, ... args), 0);
    };

    client.send = (... args) => setTimeout(() => server.receive(... args), 0);

    server.store = start;
    server.store.push(4);

    await forTime(5);

    test.falsy(called, 'Used an replace call with a lock');
    test.deepEqual(client.store, server.store, 'both arrays must match');
    test.deepEqual(client.store, result, 'array must have sorted');
});

test('Locking should use in-place modifies', async test => {
    const start = [1, 2, 3];
    const result = [1, 2, 3, 4];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    let called = false;

    server.send = (msg, ... args) => {
        if (msg === 'call') called = true;
        setTimeout(() => client.receive(msg, ... args), 0);
    };

    client.send = (... args) => setTimeout(() => server.receive(... args), 0);

    server.store = start;

    await server.lock(server.store);
    server.store.push(4);
    server.release(server.store);

    await forTime(5);

    test.truthy(called, 'Used an in-place call with a lock');
    test.deepEqual(client.store, server.store, 'both arrays must match');
    test.deepEqual(client.store, result, 'array must have sorted');
});

test('in-place pop works as expected', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(server, client);

    server.store = [1,2,3,4];

    await server.lock(server.store);

    test.truthy(server.store.pop() === 4, 'Value was returned');

    await idle();

    consistent(test, server, client);

    const vectors = [
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1],
    ];

    test.deepEqual(server.store, [1, 2, 3], 'Value was removed');
    test.deepEqual(server._debug(server.store).vectors, vectors, 'Write vectors are what we expect');
});

test('in-place push works as expected', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(server, client);

    server.store = [1,2,3,4];

    await server.lock(server.store);

    server.store.push(5);

    await idle();

    consistent(test, server, client);

    const vectors = [
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1]
    ];

    test.deepEqual(server.store, [1, 2, 3, 4, 5], 'Value was appended');
    test.deepEqual(server._debug(server.store).vectors, vectors, 'Write vectors are what we expect');
});

test('in-place reverse works as expected', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    const idle = link(server, client);

    server.store = [1,2,3,4];

    await server.lock(server.store);

    server.store.reverse();

    await idle();

    consistent(test, server, client);

    const vectors = [
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1],
        [server._hostname, 1]
    ];

    test.deepEqual(server.store, [4, 3, 2, 1], 'Values were removed');
    test.deepEqual(server._debug(server.store).vectors, vectors, 'Write vectors are what we expect');
});
