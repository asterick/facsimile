const EventEmitter = require("events");

const Vector = require('./vector');
const { clone, guid } = require('./util');
const { CallFunctions, CallNames } = require('./calls');

const GC_TIME = 100;

class Facsimile extends EventEmitter {
	constructor(hostname) {
		super();

		this._hostname = `${hostname}:${Date.now()}`;

		this._id = new WeakMap();		// ID Reference table
		this._vectors = new WeakMap();	// Collection write vectors
		this._proxy = new WeakMap();	// Proxy collection
		this._objects = {};				// Would like a WeakValueMap here
		this._pending = {};				// Waiting for state (lazy refs)
		this._locks	= new WeakMap();	// Active semaphor locks

		this._pending_count = 0;		// Number of waiting states
		this._batch_refs = null;		// References per transmission we need to batch
	}

	// Get the proxied store
	get store() {
		if (this._root && typeof this._root === 'object') {
			return this._proxy.get(this._root);
		} else {
			return this._root;
		}
	}

	set store(base) {
		this._root = base;
		this.send('root', { root: this._reference(base) });
		this.emit('root_changed');
	}

	sync() {
		this._objects = {};
		this._root = null;

		this.send('sync');
	}

	send(message, payload) {
		throw new Error('This object does not have support signalling');
	}

	receive(message, payload) {
		switch (message) {
		case 'sync':
			this._sync();
			break ;
		case 'root':
			this._dereference(this, '_root', payload.root);
			this._schedule_gc();
			this.emit('root_changed');
			break ;
		case 'export':
			this._export(payload.hostname, payload.references);
			break ;
		case 'import':
			this._import(payload.members, payload.vectors);
			break ;
		case 'init':
			// We assume these are safe to change references
			this._init(payload.hostname, payload.members);
			this._schedule_gc();
			break ;
		case 'delete':
			// Ignore modifications to objects in a pending state
			if (this._objects[payload.id] === undefined) break ;

			this._delete(payload.id, payload.property, payload.vector);
			this._schedule_gc();
			break ;
		case 'assign':
			// Ignore modifications to objects in a pending state
			if (this._objects[payload.id] === undefined) break ;

			this._assign(payload.id, payload.property, payload.value, payload.vector);
			this._schedule_gc();
			break ;
		case 'call':
			// Ignore modifications to objects in a pending state
			if (this._objects[payload.id] === undefined) break ;

			this._call(payload.id, payload.name, payload.host, payload.parameters);
			this._schedule_gc();
			break ;
		case 'replace':
			// Ignore modifications to objects in a pending state
			if (this._objects[payload.id] === undefined) break ;

			this._replace(payload.id, payload.vector, payload.values);
			this._schedule_gc();
			break ;
		default:
			throw new Error(`Cannot process message type: ${message}`);
		}

		// Request any references we don't know about
		if (this._batch_refs) {
			const references = this._batch_refs;
			this._batch_refs = null;

			this.send('export', { hostname: this._hostname, references });
		}
	}

	// Private member calls
	_gc () {
		if (!this._gc_handle) return ;
		this._gc_handle = null;

		if (!this._root || typeof this._root !== 'object') {
			this._objects = {};
			return ;
		}

		const ids = {};
		const targets = [this._root];

		while (targets.length > 0) {
			const leaf = targets.pop();
			const id = this._id.get(leaf);

			if (ids[id] !== undefined) continue ;

			ids[id] = leaf;

			for (let [key, value] of Object.entries(leaf)) {
				if (!value || typeof value !== 'object') continue;
				
				targets.push(value);
			}
		}

		this._objects = ids;
	}

	_schedule_gc() {
		this._gc_handle = setTimeout(_ => this._gc(), GC_TIME);
	}

	_inject(id, object, hostname) {
		const vectors = new (Object.getPrototypeOf(object).constructor);

		// Load into our map set
		this._objects[id] = object;
		this._proxy.set(object, new Proxy(object, this));
		this._id.set(object, id);
		this._vectors.set(object, vectors);

		for (let [key, value] of Object.entries(object)) {
			vectors[key] = Vector.create(hostname);
		}
	}

	_implement(object, members) {
		if (this._id.has(object)){
			return [ this._id.get(object) ];
		}

		const id = guid(this._hostname);
		const values = new (Object.getPrototypeOf(object).constructor);

		this._inject(id, object, this._hostname);

		for (let [key, value] of Object.entries(object)) {
			// Determine if this is a reference type, and if we need to signal that
			if (value && typeof value === 'object') {
				values[key] = this._implement(value, members);
			} else {
				values[key] = value;
			}
		}

		members[id] = values;

		return [ id ];
	}

	_update_vector(target, property) {
		// Update our write vector
		const vectors = this._vectors.get(target);
		let vector = vectors[property];

		if (vector === undefined) {
			vector = Vector.create(this._hostname);
		} else {
			vector = Vector.increment(vector, this._hostname);
		}

		vectors[property] = vector;

		return vector;
	}

	_lazy_ref(reference, target = null, key = null) {
		// No outstanding request for this state
		if (this._pending[reference] === undefined) {
			this._pending[reference] = [];
			this._pending_count++;

			const batch = this._batch_refs || (this._batch_refs = []);

			this._batch_refs.push(reference);
		}

		// We need to make sure we 
		if (target) {
			const lazy = this._pending[reference];
			lazy.push({ target, key });
		}
	}

	_defined(value) {
		if (Array.isArray(value)) {
			const [ ref ] = value;

			// This is a safe value to resolve
			return this._objects[ref] !== undefined;
		}

		return true;
	}

	_dereference(object, key, value) {
		if (Array.isArray(value)) {
			const [ ref ] = value;

			// Create a lazy reference to be resolved later
			if (this._objects[ref] === undefined) {
				delete object[key];
				this._lazy_ref(ref, object, key);
				return ;
			}

			object[key] = this._objects[ref];
		} else {
			object[key] = value;
		}
	}

	_reference (value) {
		if (!value || typeof value !== 'object') {
			return value;
		} else if (typeof value === 'function') {
			throw new Error("Cannot serialize functions");
		} else if (this._id.has(value)) {
			return [ this._id.get(value) ];
		}

		let members = {};
		let id = this._implement(value, members);
		this.send('init', { hostname: this._hostname, members });

		return id;
	}

	// Receiving side calls
	_init(hostname, members) {
		for (let [id, object] of Object.entries(members)) {
			this._inject(id, object, hostname);
		}

		for (let [id, object] of Object.entries(members)) {
			for (let [key, value] of Object.entries(object)) {
				this._dereference(object, key, value);
			}
		}
	}

	_delete(id, property, vector_b) {
		const object = this._objects[id];

		if (object === undefined) {
			return ;
		}

		const vectors = this._vectors.get(object);
		const vector_a = vectors[property];

		if (!Vector.compare(vector_a, vector_b)) return ;

		const proxy = this._proxy.get(object);

		delete object[property];

		this.emit(`change`, proxy, property, undefined, object[property]);
		this.emit(`change;${id}`, proxy, property, undefined, object[property]);
		this.emit(`change;${id};${property}`, proxy, property, undefined, object[property]);
	}

	_assign(id, property, value, vector_b) {
		const object = this._objects[id];

		if (object === undefined) {
			return ;
		}

		const vectors = this._vectors.get(object);
		const vector_a = vectors[property];

		if (!Vector.compare(vector_a, vector_b)) return ;

		vectors[property] = vector_b;

		const previous = object[property];

		this._dereference(object, property, value);

		const proxy = this._proxy.get(object);

		this.emit(`change`, proxy, property, object[property], previous);
		this.emit(`change;${id}`, proxy, property, object[property], previous);
		this.emit(`change;${id};${property}`, proxy, property, object[property], previous);
	}

	_flatten(object) {
		const values = new (Object.getPrototypeOf(object).constructor);

		for (let [key, value] of Object.entries(object)) {
			values[key] = this._reference(value);
		}

		return values;
	}

	_import(members, vectors) {
		const ids = Object.keys(members).filter(id => this._pending[id]);

		for (let id of ids) {
			const object = new (Object.getPrototypeOf(members[id]).constructor);
			
			this._objects[id] = object;
			this._proxy.set(object, new Proxy(object, this));
			this._id.set(object, id);
			this._vectors.set(object, vectors[id]);
		}

		for (let id of ids) {
			const object = this._objects[id];
			
			for (let [key, value] of Object.entries(members[id])) {
				this._dereference(object, key, value);
			}

			for (let { target, key } of this._pending[id]) {
				target[key] = this._objects[id];
			}

			delete this._pending[id];

			if (--this._pending_count == 0) {
				this.emit('ready');
			}
		}
	}

	_export(hostname, references) {
		const members = {};
		const vectors = {};

		for (let id of references) {
			const object = this._objects[id];

			if (object === undefined) continue ;

			const out_vect = new (Object.getPrototypeOf(object).constructor);
			const in_vect = this._vectors.get(object);

			vectors[id] = out_vect;
			members[id] = this._flatten(object);

			for (let [key, value] of Object.entries(object)) {
				out_vect[key] = in_vect[key].concat();
			}
		}

		this.send('import', { hostname, members, vectors });
	}

	_sync() {
		this.send('root', { root: this._reference(this._root) });
	}

	_call(id, name, host, parameters) {
		const target = this._objects[id];
		const proxy = this._proxy.get(target);

		for (let [key, value] of Object.entries(parameters)) {
			if (!this._defined(value)) {
				_lazy_ref(id);
				return ;
			}

			this._dereference(parameters, key, value);
		}

		const funct = CallNames[name].bypass;
		funct.call(target, host, this._vectors.get(target), ... parameters);

		this.emit(`change`, proxy);
		this.emit(`change;${id}`, proxy);
	}

	_replace(id, vector, values) {
		const target = this._objects[id];
		const proxy = this._proxy.get(target);

		const vectors = this._vectors.get(target);

		// Flush previous instances
		for (let [key, value] of Object.entries(target)) {
			delete target[key];
			delete vectors[key];
		}

		for (let [key, value] of Object.entries(values)) {
			if (!Vector.compare(vectors[key], vector)) continue;

			this._dereference(target, key, value);
			vectors[key] = vector;
		}

		this.emit(`change`, proxy);
		this.emit(`change;${id}`, proxy);
	}

	// Proxy handlers
	get (target, property, proxy) {
		// Injected calls
		switch (property) {
		case 'on':
			return (prop, cb) => {
				const ref = this._id.get(target);
				
				if (typeof prop === 'function') {
					this.on(`change;${ref}`, prop);
				} else {
					this.on(`change;${ref};${prop}`, cb);
				}
			};
		case 'off':
			return (prop, cb) => {
				const ref = this._id.get(target);
				
				if (typeof prop === 'function') {
					this.off(`change;${ref}`, prop);
				} else {
					this.off(`change;${ref};${prop}`, cb);
				}
			};
		}

		// Overlay
		switch (typeof target[property]) {
		case 'object':
			return this._proxy.get(target[property]);

		case 'function':
			{
				const funct = CallFunctions.get(target[property]);

				if (!funct) return target[property];

				if (funct.bypass) {
					return (... args) => {
						const id = this._id.get(target);
						const parameters = this._flatten(args);
						const ret = funct.bypass.call(target, this._hostname, this._vectors.get(target), ... args);
						const name = funct.name;

						this.emit(`change`, proxy);
						this.emit(`change;${id}`, proxy);

						this.send('call', { id, name, host: this._hostname, parameters });

						return ret;
					}
				} else {
					return (... args) => {
						const id = this._id.get(target);
						const ret = funct.prototype.apply(target, args);
						const values = this._flatten(target);
						const vectors = this._vectors.get(target);
						const weight = vectors.reduce((acc, vec) => Math.max(acc, vec[0]), 0) + 1;
						const vector = [ weight, this._hostname ];

						for (let [i, vector] of Object.entries(vectors)) {
							vectors[i] = vector;
						}

						this.emit(`change`, proxy);
						this.emit(`change;${id}`, proxy);

						this.send('replace', { id, vector, values });

						return ret;
					}
				}
			}

		default:
			return target[property];
		}
	}

	deleteProperty (target, property) {
		if (typeof target[property] === 'object') this._schedule_gc();

		const id = this._id.get(target);

		// Object is locked
		if (this._pending[id]) return false;

		const vector = this._update_vector(target, property);
		const proxy = this._proxy.get(target);

		const previous = target[property];
		delete target[property];

		this.emit(`change`, proxy, property);
		this.emit(`change;${id}`, proxy, property);
		this.emit(`change;${id};${property}`, proxy, property);

		this.send('delete', { id, property, vector });

		return true;
	}

	set (target, property, value, proxy) {
		// Unmodified value
		if (target[property] === value) return ;

		if (typeof target[property] === 'object') this._schedule_gc();

		// This object has a lock, 
		if (this._locks.has(target)) {
			throw this._locks.get(target);
		}

		// Signal this property has changed
		const id = this._id.get(target);

		// Object is locked
		if (this._pending[id]) return false;

		const previous = target[property];
		target[property] = value;

		this.emit(`change`, proxy, property);
		this.emit(`change;${id}`, proxy, property);
		this.emit(`change;${id};${property}`, proxy, property);

		// Dereference
		value = this._reference(value);
		const vector = this._update_vector(target, property);

		this.send('assign', { id, property, value, vector });

		return true;
	}
}

module.exports = Facsimile;
