function promise() {
	let group = {}

	group.promise = new Promise((success, failure) => {
		Object.assign(group, { success, failure });
	});

	return group;
}

class Locks {
	constructor(node) {
		this._node = node;
		this._locks = new WeakMap();
	}

	owns(target) {
		const lock = this._locks.get(target);

		// Unowned
		if (!lock) return true;

		return lock.hostname === this._node._hostname;
	}

	_lock(hostname) {
		return  {
			acknowledge: promise(),
			release: promise(),
			hostname
		};
	}

	create(target) {
		if (this._locks.has(target)) {
			throw new Error("Object is locked");
		}

		const id = this._node._id.get(target);
		const hostname = this._node._hostname;
		const lock = this._lock(hostname);

		this._locks.set(target, lock);
		this._node.send('lock:req', { hostname, id });

		return lock.acknowledge.promise;
	}

	release(target) {
		const lock = this._locks.get(target);

		console.log(lock)

		if (!lock || !lock.fixed) {
			throw new Error("Object is not locked");
		}

		if (!this.owns(target)) {
			throw new Error("Node do not own this lock");
		}

		const id = this._node._id.get(target);
		const hostname = this._node._hostname;

		this._locks.delete(target);

		this._node.send('lock:unlock', { hostname, id });
 	}

 	await(target) {
		const lock = this._locks.get(target);

		if (!lock) {
			return Promise.resolve();
		}

		return lock.release.promise;
 	}

 	request(payload) {
 		const { id, hostname } = payload;
 		const target = this._node._objects[id];
		let lock = this._locks.get(target);

 		let success = true;

 		// Existing lock is lower priority
 		if (lock) {
 			if (lock.fixed || lock.hostname < hostname) {
		 		this._node.send('lock:ack', { id, success: false });
		 		return ;
	 		}
 	
	 		lock.hostname = hostname;
 		} else {
	 		this._locks.set(target, this._lock(hostname));
 		}

 		this._node.send('lock:ack', { id, success: true });
 	}

 	acknowledge(payload) {
 		const { id, success } = payload;
 		const target = this._node._objects[id];
		const lock = this._locks.get(target);

 		const reply = success ? lock.acknowledge.success : lock.acknowledge.failure;
 		delete lock.ack_promise;
 		lock.fixed = true;

 		reply(lock.hostname);
 	}

 	unlock(payload) {
 		const { id, hostname } = payload;
 		const target = this._node._objects[id];
		const lock = this._locks.get(target);

		if (lock && lock.hostname == hostname) {
			this._locks.delete(target);
			lock.release.success();
		}
 	}
}

module.exports = Locks;
