const Facsimile = require('..');
const test = require('ava');

function forTime(time) {
    return new Promise((pass) => {
        setTimeout(pass, time);
    });
}

function link(... hosts) {
    for (let source of hosts) {
        source.send = (... args) => {
            const mirrored = JSON.parse(JSON.stringify(args));
            setTimeout(() => {
                for (let target of hosts) {
                    if (target === source) continue ;
                    target.receive(... mirrored);
                }
            }, 10);
        };
    }
}

test('Basic sort works', async test => {
    const result = [1, 2, 3, 4];

    const server = new Facsimile('a');
    const client = new Facsimile('b');

    link(client, server);

    // Signal forwarding (same amount of time between)
    server.send = (... args) => setTimeout(() => client.receive(... args), 10);
    client.send = (... args) => setTimeout(() => server.receive(... args), 10);

    server.store = [3, 1, 4, 2];
    server.store.sort((a, b) => (a - b));

    await forTime(100);

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
        setTimeout(() => client.receive(msg, ... args), 10);
    };

    client.send = (... args) => setTimeout(() => server.receive(... args), 10);

    server.store = start;
    server.store.push(4);

    await forTime(100);

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
        setTimeout(() => client.receive(msg, ... args), 10);
    };

    client.send = (... args) => setTimeout(() => server.receive(... args), 10);

    server.store = start;

    await server.lock(server.store);
    server.store.push(4);
    server.release(server.store);

    await forTime(100);

    test.truthy(called, 'Used an in-place call with a lock');
    test.deepEqual(client.store, server.store, 'both arrays must match');
    test.deepEqual(client.store, result, 'array must have sorted');
});
