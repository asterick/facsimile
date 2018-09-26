const Facsimile = require('..');

const a = new Facsimile('parent');
const b = new Facsimile('dependant');

// Setup store with an unlinked tunnel
setTimeout(() => {
    console.log('Initialize Store');
    a.send = (message, payload) => console.log(a._hostname, message, payload);
    b.send = (message, payload) => console.log(b._hostname, message, payload);
}, 10);

// Create another store to listen
setTimeout(() => {
    console.log('Initialize Connection');
    a.send = (message, payload) => setTimeout(_ => {
        console.log(a._hostname, message, payload);
        b.receive(message, payload);
    }, 0);

    b.send = (message, payload) => setTimeout(_ => {
        console.log(b._hostname, message, payload);
        a.receive(message, payload);
    }, 0);

    b.sync();
}, 20);

setTimeout(() => {
    a.store = { a: [1,2,3], c: { d: [ 1,2,3 ], z: [2,1,8,5,3,100] }};
    a.store.c.d.push([1,2,3]);
}, 30);

setTimeout(() => {
    b.sync();
}, 40);

setTimeout(() => {
    Object.assign(a.store, { x: 10, y: 11, z: 12 });
    a.store.c.z[3] = 999;
}, 50);

setTimeout(() => {
    b.store.c.z.sort();
}, 60);

setTimeout(() => {
}, 70);

setTimeout(_ => {
    console.log(a.store);
    console.log(b.store);
}, 500);
