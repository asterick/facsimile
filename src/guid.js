const base = Date.now();

let inc;
let last_date;

function guid(hostname) {
    const date = Date.now() - base;
    if (last_date !== date) {
        inc = 0;
        last_date = date;
    }

    return `${hostname}:${date}:${inc++}`;
}

module.exports = guid;
