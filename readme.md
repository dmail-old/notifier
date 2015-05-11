# notifier

Inspired from [js-signals](https://github.com/millermedeiros/js-signals)

## Example

```javascript
var notifier = require('notifier').create();

notifier.add(console.log, console);
notifier.notify('foo', 'bar'); // logs 'foo bar'
```

## createBinding(listener, bind = null, isOnce = false)

This function is used internally, it returns an object representing the listener/bind duo.<br />
listener can be a function with an optional bind.<br />
listener can be an object with in case bind is a required method name.<br />
isOnce indicates if the binding wants to be removed just after being executed.

```javascript
var Notifier = require('notifier');
var consoleFunctionBinding = Notifier.createBinding(console.log, console);
var consoleMethodBinding = Notifier.createBinding(console, 'log');

consoleFunctionBinding.exec('foo', 'bar'); // logs 'foo bar'
consoleMethodBinding.exec('foo', 'bar'); // logs 'foo bar'

// you can also use execArgs
consoleMethodBinding.execArgs(['foo', 'bar']); // logs 'foo bar'
```

## get(listener, bind = null)

Returns the object representing the duo listener/bind or null.

```javascript
function foo(){};

notifier.add(foo, 'bar', true);
notifier.add(foo, 'boo');

var binding = notifier.get(foo);

binding.listener; // foo
binding.bind; // 'bar'
binding.isOnce; // true
```

## has(listener, bind = null)

Returns if the duo listener/bind exists for this notifier.

```javascript
function foo(){};
notifier.has(foo); // false
notifier.add(foo);
notifier.has(foo); // true
```

## add(listener, bind = null, once = false)

Register the duo listener/bind (duplicate listeners are removed).<br />
If once is true, the listener will be removed just before being called.

```javascript
var notifier = require('notifier').create();

notifier.add(console.log, console);
notifier.add({foo: function(){ console.log('foo'); }}, 'foo');
notifier.add(function(){ console.log('once');  }, null, true);

notifier.notify('boo'); // logs 'boo', 'foo', 'once'
notifier.size; // 2
notifier.notify('boo'); // logs 'boo', 'foo'
```

## addOnce(listener, bind)

Shortcut to add a listener once.

## remove(listener, bind = null)

Remove the duo listener/bind from the notifier

## notify(...)

Call listeners with the provided arguments

## prevent()

Prevent next listeners from being called

```javascript
notifier.add(function(){ notifier.prevent(); });
notifier.add(function(){ console.log('here'); });
notifier.notify(); // nothing is logged
```

## disable()

notify() will have no effect

## enable()

Restore notify() behaviour

## clear()

Remove all listeners & remove all references to external/internal objects

## size

The number of listeners for this notifier

## bind

Default binding for function listeners

```javascript
var notifier = require('notifier').create();
notifier.bind = 'foo';
notifier.add(function(){ console.log(this); });
notifier.add(function(){ console.log(this); }, 'bar');
notifier.notify(); // logs 'foo', 'bar'
```

## method

Default method for object listeners

```javascript
var notifier = require('notifier').create();
notifier.method = 'log';
notifier.add(console);
notifier.add(console, 'warn');
notifier.notify('foo'); // logs 'foo' & warn 'foo'
```

## args

Curried arguments

```javascript
var notifier = require('notifier').create();
notifier.args = ['foo'];
notifier.add(console.log, console);
notifier.notify('bar'); // logs 'foo bar'
```

## memorize

Save arguments when notify() is called and call immediatly listeners added after.

```javascript
var notifier = require('notifier').create();

notifier.memorize = true;
notifier.notify('foo');
notifier.add(console.log); // logs 'foo'
```

## forget()

Use with memorize, forget previously saved arguments

```javascript
var object = {
  paused: Notifier.create(),

  pause: function(){
    this.paused.notify('pause');
  },

  resume: function(){
    this.paused.forget();
  }
};

object.paused.memorize = true;

object.pause();
object.resume();
object.paused.add(console.log); // logs nothing because paused.forget() was called by resume
```
