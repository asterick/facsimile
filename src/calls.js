const CallNames = {
    array_copyWithin: { prototype: Array.prototype.copyWithin, bypass: true },
    array_fill: { prototype: Array.prototype.fill, bypass: true },
    array_pop: { prototype: Array.prototype.pop, bypass: true },
    array_push: { prototype: Array.prototype.push, bypass: true },
    array_reverse: { prototype: Array.prototype.reverse, bypass: true },
    array_shift: { prototype: Array.prototype.shift, bypass: true },
    array_splice: { prototype: Array.prototype.splice, bypass: true },
    array_unshift: { prototype: Array.prototype.unshift, bypass: true },
	
    // Heavy weight functions that cannot be safely serialized, so inplace is taken as is
    array_sort: { prototype: Array.prototype.sort },
};

const CallFunctions = new WeakMap();

for (let [key, bypass] of Object.entries(CallNames)) {
    CallNames[key].name = key;
    CallFunctions.set(bypass.prototype, bypass);
}

module.exports = {
    CallFunctions,
    CallNames
};
