const guid = require('../src/guid');
const test = require('ava');

test('Guid uniqueness', test => {
    const array = [];

    // Run for 5 ms
    let a = Date.now();
    while (Date.now() - a < 5) {
        array.push(guid('host'));
    }

    const set = new Set(array);

    test.truthy(set.size === array.length, 'All guids are unique across a long time period');
});
