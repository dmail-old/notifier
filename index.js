var proto = include('dmail/proto');

var Binding = proto.extend({
	fn: null,
	bind: null,
	isOnce: false,
	active: true,
	execArgs: null,
	applyObjectMethod: function(args){
		return this.listener[this.bind].apply(this.fn, args);
	},
	applyFunction: function(args){
		return this.listener.apply(this.bind, args);
	},

	constructor: function(listener, bind, once){
		if( typeof listener == 'object' ){
			this.execArgs = this.applyObjectMethod;
			if( typeof bind != 'string' ){
				throw new TypeError('object listener needs a method name, '+ bind + ' given');
			}
		}
		else if( typeof listener == 'function' ){
			this.execArgs = this.applyFunction;
		}
		else{
			throw new TypeError('a binding expect function or object, ' + listener + ' given');
		}

		this.listener = listener;
		this.bind = bind;
		this.isOnce = Boolean(once);
	},

	is: function(listener, bind){
		if( Binding.isPrototypeOf(listener) ) return this === listener;
		return this.listener === listener && this.bind == bind;
	},

	exec: function(){
		return this.execArgs.apply(this, arguments);
	}
});

var Notifier = proto.extend({
	Binding: Binding,
	bindings: null,
	size: 0,
	lastIndex: null,
	stopped: false,
	index: 0,
	active: true,
	memorize: false, // memorize aguments
	savedArgs: null, // memorized arguments
	args: null, // curried arguments
	bind: null, // default bind for function listener
	method: null, // default method for object listener

	// http://benalman.com/projects/jquery-throttle-debounce-plugin/
	interval: 0, // ignore subsequent calls hapenning before interval ellapsed
	latency: 0, // delay last call until latency ellapsed
	lastCall: null,
	timeout: null,

	constructor: function(name){
		this.name = name;
		this.bindings = [];
	},

	open: function(){

	},

	close: function(){

	},

	forget: function(){
		this.savedArgs = null;
	},

	enable: function(){
		if( this.active === false ){
			this.active = true;
			return true;
		}
		return false;
	},

	disable: function(){
		if( this.active === true ){
			this.active = false;
			return true;
		}
		return false;
	},

	prevent: function(){
		this.stopped = true;
	},

	createBinding: function(listener, bind, once){
		if( !bind ){
			if( typeof listener === 'function' ) bind = this.bind;
			else bind = this.method;
		}

		return this.Binding.create(listener, bind, once);
	},

	get: function(listener, bind){
		var bindings = this.bindings, index = bindings.length, binding;

		while(index--){
			binding = bindings[index];
			if( binding.is(listener, bind) ){
				this.lastIndex = index;
				return binding;
			}
		}

		return null;
	},

	has: function(listener, bind){
		return this.get(listener, bind) !== null;
	},

	add: function(listener, bind, once){
		var binding = this.get(listener, bind);

		if( binding ){
			if( binding.isOnce != once ){
				throw new Error('you cannot add() & addOnce() the same listener');
			}
			return false;
		}

		binding = this.createBinding(listener, bind, once);
		this.bindings.push(binding);
		this.size++;
		if( this.size === 1 ) this.open();

		if( this.memorize && this.savedArgs ){
			this.applyBinding(binding, this.savedArgs);
		}

		return binding;
	},

	addOnce: function(listener, bind){
		return this.add(listener, bind, true);
	},

	remove: function(listener, bind){
		if( this.has(listener, bind) ){
			this.bindings.splice(this.lastIndex, 1);
			this.index--;
			this.size--;
			if( this.size === 0 ) this.close();
			return true;
		}
		return false;
	},

	clear: function(){
		this.savedArgs = null;
		if( this.size === 0 ) return false;
		this.bindings.length = this.size = this.index = 0;
		return true;
	},

	forEach: function(fn, bind){
		this.index = 0;
		// we don't catch index and length in case remove() or clear() is called during the loop
		while( this.index < this.size ){
			if( fn.call(bind, this.bindings[this.index]) === false ) break;
			this.index++;
		}
	},

	applyBinding: function(binding, args){
		if( binding.active === true ){
			if( this.memorize ){
				this.savedArgs = args;
			}

			var interval, latency, now, last, prevent, diff;

			interval = this.interval;
			latency = this.latency;

			if( interval || latency ){
				now = new Date();
				last = this.lastCall;
				diff = last ? now - last : 0;

				if( interval ){
					// prevent subsequent calls hapenning before interval ellapsed
					prevent = last && diff < interval;
				}
				if( latency ){
					// prevent calls hapening before latency ellapsed
					prevent = diff < latency;

					if( prevent ){
						// clear any previously delayed call
						clearTimeout(this.timeout);
						// delay the call
						this.timeout = setTimeout(this.applyBinding.bind(this, binding, args), latency - diff);
					}
				}

				this.lastCall = now;
				if( prevent ){
					return false;
				}
			}

			if( binding.isOnce === true ){
				this.remove(binding);
			}

			return binding.execArgs(args);
		}
	},

	notifyArgs: function(args){
		if( this.active === true ){
			this.stopped = false;

			if( this.args && this.args.length ){
				if( args && args.length ){
					args = this.args.push.apply(this.args, args);
				}
				else{
					args = this.args;
				}
			}

			return this.forEach(function(binding){
				return this.stopped ? false : this.applyBinding(binding, args);
			}, this);
		}
		return false;
	},

	notify: function(){
		return this.notifyArgs(arguments);
	}
});

Notifier.assignNotifiers = function(){
	var i = 0, j = arguments.length, name;

	for(;i<j;i++){
		name = arguments[i];
		this[name] = Notifier.create(name);
	}
};

return Notifier;