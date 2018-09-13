const { clone, guid } = require('./util');

const BASE_OBJECT = '\x00\x00unwrap_proxy\x00\x00';

// TODO: Subscriptions from proxies
// TODO: Call sanitation

class Doppel {
	constructor(base) {
		this._lookup = new WeakMap();
		this._objects = {};
		this._lazy = {};

		const store = base || {};

		this._register('root', store);
	}

	// Create a Doppel store from an object
	static from(base) {
		return new Doppel(clone(base));
	}

	// Get the proxied store
	get store() {
		return new Proxy(this._objects.root, this);
	}

	sync() {
		this.emit('request', { id: 'root' });
	}

	// Messaging interface
	emit(message, payload) {
		throw new Error(`No message pipe defined`);
	}

	receive(message, payload) {
		const object = this._objects[payload.id];

		switch (message) {
		case 'values':
			this._register(payload.id, payload.values);

			let refs = this._lazy[payload.id];
			if (refs) {
				refs.forEach(ref => {
					const object = this._objects[ref.id];
					object[ref.property] = payload.values;
				})
				delete this._lazy[payload.id];
			}

			break ;
		case 'request':
			this._transmit(payload.id);
			break ;
		case 'delete':
			delete object[payload.property];
			break ;
		case 'assign':
			object[payload.property] = payload.value;
			break ;
		case 'reference':
			if (this._objects[payload.reference] !== undefined) {
				object[payload.property] = this._objects[payload.reference];
				break ;
			}

			// Register a lazy reference
			let lazy = this._lazy[payload.reference];
			if (lazy) {
				lazy.push(payload);
			} else {
				this._lazy[payload.reference] = [payload];
			}	

			// Ask for the object 
			this.emit('request', { id: payload.reference });
			break ;
		case 'call':
			object[payload.property].apply(object, payload.parameters);
			break ;
		default:
			throw new Error(`${message}: ${JSON.stringify(payload)}`);
		}
	}

	// Internal private functions
	_gc () {
		const ids = {};
		const targets = ['root'];

		while (targets.length > 0) {
			const id = targets.pop();

			if (ids[id] !== undefined) continue ;

			const leaf = this._objects[id];
			ids[id] = leaf;

			const props = Object.keys(leaf)
				.filter(key => typeof leaf[key] === 'object')
				.forEach(key => {
					targets.push(this._track(leaf[key]));
				});
		}

		this._objects = ids;
	}

	_transmit (id) {
		const obj = this._objects[id];
		let values;

		const refs = [];

		if (Array.isArray(obj)) {
			values = obj.map((val) => (typeof val === 'object' || typeof val === 'function') ? null : val);
		} else {
			values = Object.keys(obj).reduce((acc, key) => {
				const val = obj[key];

				switch (typeof val) {
				case 'function':
					break ;
				case 'object':
					if (val !== null) {
						refs.push(key);
						break ;
					}
				default:
					acc[key] = val;
				}

				return acc;
			}, {});
		}

		this.emit('values', { id, values });

		refs.forEach(property => {
			const reference = this._track(obj[property]);
			this.emit('reference', { id, property, reference });
		})
	}

	_proxy (obj) {
		return new Proxy(obj, this);
	}

	_register(id, object) {
		this._objects[id] = object;
		this._lookup.set(object, id);
		return id;
	}

	_track (object) {
		let id = this._lookup.get(object);

		if (id !== undefined) return id;

		return this._register(guid(), object);
	}

	_unwrap (object) {
		if (!object || typeof object !== 'object') return object;
		return object[BASE_OBJECT] || object;
	}

	// These are the proxy handlers
	get (target, property, receiver) {
		const id = this._track(target);
		const that = this;

		if (property === BASE_OBJECT) return target;

		switch (typeof target[property]) {
		case 'object':
			return new Proxy(target[property], this);	

		case 'function':
			return function () {
				const parameters = Array.from(arguments);

				// NOTE: This should perform some kind of sanitation
				that.emit('call', { id, property, parameters });

				target[property].apply(target, parameters);
			}

		default:
			return target[property];
		}
	}

	deleteProperty (target, property) {
		const id = this._track(target);
		this.emit('delete', { id, property });
		delete target[property];
	}

	set (target, property, value, receiver) {
		// Don't track if we already have the value set to this
		if (target[property] === value) return ;

		// Start moving stuff around
		const id = this._track(target);

		switch (typeof value) {
			case 'object':
				if (value) {
					value = this._unwrap(value);
					const reference = this._track(value);
					this.emit('reference', { id, property, reference });
					break ;
				}

			default:
				this.emit('assign', { id, property, value });

			case 'function':
				break ;
		}

		target[property] = value;
	}
}

module.exports = {
	Doppel
}
