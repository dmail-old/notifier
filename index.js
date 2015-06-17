var proto = include('dmail/proto');

var Binding = proto.extend({
	fn: null,
	bind: null,
	execArgs: null,

	// http://benalman.com/projects/jquery-throttle-debounce-plugin/
	options: {
		once: false,
		disabled: false,
		interval: 0, // ignore subsequent calls hapenning before interval ellapsed
		latency: 0 // delay last call until latency ellapsed
	},

	lastCall: null,
	isDisabled: false, // can be disabled by disabled, interval, latency
	isOnce: false, // when the options once is true
	delay: 0,

	applyObjectMethod: function(args){
		return this.listener[this.bind].apply(this.fn, args);
	},
	applyFunction: function(args){
		return this.listener.apply(this.bind, args);
	},

	constructor: function(listener, bind, options){
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
		this.options = options ? Object.assign({}, this.options, options) : this.options;
	},

	update: function(){
		var isPrevented, delay, interval, latency, now, last, diff;

		isPrevented = this.options.disabled;
		delay = 0;
		interval = this.options.interval;
		latency = this.options.latency;

		if( interval || latency ){
			now = new Date();
			last = this.lastCall;
			diff = last ? now - last : 0;

			if( interval ){
				// prevent subsequent calls hapenning before interval ellapsed
				if( last && diff < interval ) isPrevented = true;
			}
			if( latency ){
				// prevent calls hapening before latency ellapsed
				if( diff < latency ){
					isPrevented = true;
					// delay this binding of some ms
					delay = latency - diff;
				}
			}

			this.lastCall = now;
		}

		this.isPrevented = isPrevented;
		this.delay = delay;
		this.isOnce = this.options.isOnce;
	},

	compareOptions: function(options){
		var bindingOptions = this.options, defaultOptions = Binding.options, useDefaultOptions = bindingOptions == defaultOptions, key;

		// default options
		if( useDefaultOptions ) return !options || options == defaultOptions;
		for(key in bindingOptions){
			if( options[key] != bindingOptions[key] ) return false;
		}
		return true;
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

	add: function(listener, bind, options){
		var binding = this.get(listener, bind);

		if( binding ){
			if( false === binding.compareOptions(options) ){
				throw new Error('you cannot add() same listener with different options');
			}
			return false;
		}

		binding = this.createBinding(listener, bind, options);
		this.bindings.push(binding);
		this.size++;
		if( this.size === 1 ) this.open();

		if( this.memorize && this.savedArgs ){
			this.applyBinding(binding, this.savedArgs);
		}

		return binding;
	},

	addOnce: function(listener, bind){
		return this.add(listener, bind, {isOnce: true});
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
		if( this.memorize ){
			this.savedArgs = args;
		}

		binding.update();

		// delay a binding call
		if( binding.delay ){
			// clear any previously delayed call
			clearTimeout(this.timeout);
			// delay the call
			this.timeout = setTimeout(this.applyBinding.bind(this, binding, args), binding.delay);
		}

		// prevent the binding call (keep after delay because isDisabled may change after delay is ellapsed)
		if( binding.isDisabled ){
			return false;
		}

		if( binding.isOnce ){
			this.remove(binding);
		}

		return binding.execArgs(args);
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