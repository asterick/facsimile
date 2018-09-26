function forTime(time) {
    return new Promise((pass) => {
        setTimeout(pass, time);
    });
}

function link(... hosts) {
    let pending = 0;

    for (let source of hosts) {
        source.send = (... args) => {
            pending ++;
            const mirrored = JSON.parse(JSON.stringify(args));
            setTimeout(() => {
                for (let target of hosts) {
                    if (target === source) continue ;
                    target.receive(... mirrored);
                }
                pending --;
            }, 0);
        };
    }

    return () => {
        return new Promise((pass) => {
            function tick() {
                if (pending > 0) {
                    setInterval(tick, 1);
                } else {
                    pass();
                }
            }

            tick();
        });
    };
}

function consistent(test, first, ... additional) {
    const first_id = first._debug(first.store).id;
    first._gc();

    for (let second of additional) {
        const second_id = second._debug(second.store).id;
        second._gc();

        // Note: this does not work if the root node is a value
        test.truthy(first_id === second_id, 'Both stores share the same root object');
        test.deepEqual(first._objects, second._objects, 'Both stores are the same');

        for (let key of Object.keys(first._objects)) {
            const first_debug = first._debug(first._proxy.get(first._objects[key]));
            const second_debug = second._debug(second._proxy.get(second._objects[key]));

            test.deepEqual(first_debug.vectors, second_debug.vectors, 'Write vectors are the same');
        }
    }
}

module.exports = { forTime, link, consistent };
