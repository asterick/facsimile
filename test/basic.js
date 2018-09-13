const { Doppel } = require("../src");

const a = new Doppel();
const b = new Doppel();

a.emit = (msg, payload) => (console.log("A", msg, payload), b.receive(msg, payload));
b.emit = (msg, payload) => (console.log("B", msg, payload), a.receive(msg, payload));

b.sync()	// This must be called once linkage is defined

const store = a.store;

store.a = { b: {}}
store.a.b = store.a;

console.log(b.store)