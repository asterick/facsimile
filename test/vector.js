const Vector = require('../src/vector.js');
const test = require('ava');

test('vectors are truthy', test => {
    const a = Vector.create('a');

    test.truthy(a, 'should always test true');
});

test('vectors compare atomically', test => {
    const a = Vector.create('a');
    const b = Vector.create('b');

    test.falsy(Vector.compare(b, a), 'B tests higher than A');
    test.truthy(Vector.compare(a, b), 'A tests lower than B');
});

test('incremented vectors test higher', test => {
    const a = Vector.create('a');
    const b = Vector.create('b');
    const c = Vector.increment(a, '\x00');

    test.truthy(Vector.compare(a, b), 'A tests lower than B');
    test.truthy(Vector.compare(a, c), 'A tests lower than C');
    test.falsy (Vector.compare(b, a), 'B tests higher than A');
    test.truthy(Vector.compare(b, c), 'B tests lower than C');
    test.falsy (Vector.compare(c, a), 'C tests higher than A');
    test.falsy (Vector.compare(c, b), 'C tests higher than B');
});

test('can create a vector larger than entire set', test => {
    const a = Vector.create('a');
    const set_a = [Vector.increment(a, 'b'), a];
    const set_b = [a, Vector.increment(a, 'b')];

    const b = Vector.increment_set(set_a, '\x00');
    const c = Vector.increment_set(set_b, '\x00');

    test.deepEqual(b, c, 'Incremented set is the same regardless of order');

    for (let v of set_a) {
        test.truthy(Vector.compare(v, b), 'V > B');
        test.falsy(Vector.compare(b, v), 'B < V');
    }

});

test('multi-element vectors compare', test => {
    const a = ['a', 9];
    const b = ['a', 1, 0];
    const c = ['a', 0, 1];

    test.truthy(Vector.compare(a, b), 'A tests lower than B');
    test.truthy(Vector.compare(a, c), 'A tests lower than C');
    test.falsy (Vector.compare(b, a), 'B tests higher than A');
    test.truthy(Vector.compare(b, c), 'B tests lower than C');
    test.falsy (Vector.compare(c, a), 'C tests higher than A');
    test.falsy (Vector.compare(c, b), 'C tests higher than B');
});

test('Expands multi-element vectors', test => {
    const a = [0x7FFFFFFF, 0x7FFFFFFF, 'a'];
    const b = Vector.increment(a, 'b');
    const c = ['b', 0, 0, 0];

    test.deepEqual(b, c, 'Expanded');

});

test('Incrementing uninitialized should create a new element', test => {
    const a = Vector.create('hostname');
    const u = undefined;

    test.deepEqual(Vector.increment(u, 'hostname'), a);
    test.falsy(Vector.compare(a, u), 'Undefined is the lowest vector');
    test.truthy(Vector.compare(u, a), 'Undefined is the lowest vector');
});
