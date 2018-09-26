const Facsimile = require('..');
const test = require('ava');

const { forTime, link } = require('./util');

test('Basic locking works', async test => {
    const start = { b: 8000 };
    const result = { a: 9000 };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = start;

    try {
        await server.lock(server.store);
        
        delete server.store.b;
        server.store.a = 9000;
    } catch (e) {
        test.fail('Lock should succeed');
    }

    await forTime(100);

    server.release(server.store);

    await forTime(100);

    test.deepEqual(client.store, result, 'Values are deeply equal');
});

test('Locks should be exclusive', async test => {
    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = {};

    try {
        await server.lock(server.store);

        try {
            await client.request(client.store);
            test.fail('Lock was not exclusive');
        } catch (e) {
            server.store.a = 9;
        }
    } catch (e) {
        test.fail('Lock should succeed');
    }

    await forTime(100);

    server.release(server.store);

    await forTime(100);

    test.truthy(client.store.a === 9, 'exception was triggered');
});

test('Locks should be enforced', async test => {
    const result = { a: 9000 };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = {};

    try {
        await server.lock(server.store);

        server.store.a = 9000;

        const error = test.throws(() => {
            client.store.a = 9;
        });
        test.deepEqual(error.message, 'Object is not owned by current host', 'Lock must be enforced');
    } catch (e) {
        test.fail('Lock should succeed');
    }

    await forTime(100);

    server.release(server.store);

    await forTime(100);

    test.deepEqual(client.store, result, 'Values are deeply equal');
});

test('Locks cannot be released by non-owner', async test => {
    const result = { a: 9000 };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = {};

    try {
        await server.lock(server.store);

        server.store.a = 9000;

        const error = test.throws(() => {
            client.release(client.store);
        });
        test.deepEqual(error.message, 'Node does not own this lock', 'Ownership must be enforced');
    } catch (e) {
        test.fail('Lock should succeed');
    }

    await forTime(100);

    server.release(server.store);

    await forTime(100);

    test.deepEqual(client.store, result, 'Values are deeply equal');
});

test('Highest host should lock first', async test => {
    const result = { a: true, b: true };

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = {};

    await forTime(100);

    let index = 1;
    async function lock(host, node, order) {
        await node.lock(node.store);
        test.truthy(index++ === order, 'locked in order');
        node.store[host] = true;
        node.release(node.store);
        await forTime(10);
    }

    await Promise.all([ lock('b', client, 1), lock('a', server, 2) ]);

    test.deepEqual(server.store, client.store, 'Stores must match');
    test.deepEqual(server.store, result, 'All stores stuff values');
});

test('Cannot release an unlocked object', async test => {
    const server = new Facsimile('a');

    link(server);

    server.store = {};

    await forTime(100);

    const error = test.throws(() => {
        server.release(server.store);
    });
    test.deepEqual(error.message, 'Object is not locked', 'Must alert user that object was not locked');
});


test('Cannot use modify calls on locked arrays', async test => {
    const start = [1, 2, 3];
    const result = [1, 2, 3, 4];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(server, client);

    server.store = start;

    await server.lock(server.store);
    const error = test.throws(() => {
        client.store.push(4);
    });
    test.deepEqual(error.message, 'Object is locked', 'Used an in-place call with a lock');

    server.store.push(4);
    server.release(server.store);

    await forTime(100);

    test.deepEqual(client.store, server.store, 'both arrays must match');
    test.deepEqual(client.store, result, 'array must have sorted');
});
