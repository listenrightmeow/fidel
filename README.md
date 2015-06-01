# FIDEL

FIDEL is a light-weight, highly-performant and very opinionated MV**C** client framework.

* **define** : MVC without the **MV**
* **collection** : Full MVC barebones framework

### INSTALLATION

You can install this fork from Bower directory or you can download and call this library in your web application appropriately.

### INSTANTIATION

new <define.memory.reference>({});

#### options

* **el** : element that Fidel anchors all class event delegation to. If no element is defined, Fidel creates an empty div to handle class delegation.

### DEFINE

```js
fidel.define('module', {});
```

The define object is mutable and 100% customizable to end-usage patterns and preferences.

### [COLLECTION]()

#### COMMON PATTERNS

* **defaults** : class constants merged or created at instantiation
* **elements** : key/pair hoisting for string represented DOM selectors, children of this object are not cached
* **init** : optional function that is ran at instantiation

### RESERVED METHODS/PROPERTIES

```js
var Fidel = fidel.define('fidel', {});
var fidel = new Fidel({ el : $('body') });
```

```js
fidel.destroy();
```
* **destroy** : empties instantiating element for class, pragmatically unbinds all event listeners assigned to namespace and emits a 'destroy' event for pragmatic cleanup.

```js
this.emit('event', data, namespaced);
```
```js
fidel.on('event', function(event, data) {});
```
* **emit** : pragmatically emit custom event to keep classes lean.  pass data as a string or object. namespaced will emit the event with the name of the class namespace appended to the end of the event label. namespaced is optional.

```js
var Fidel = fidel.define('fidel', {
	result : fn(){},
	trigger : fn(){}
});

var fidel = new Fidel({
	el : $('body'),
	filter : {
		before : {
			result : ['trigger']
		}
	}
});
```
* **filter** : an activerecord-like callback, before or after, attached to a class method. in the example, result will be fired before trigger is executed.

```js
fidel.on('event.namespace.label', function(event, data) {});
```
```js
this.emit('event', { key : value }, '.namespace.label');
```
* **on** : anchor a handler function to a pre-defined fidel.emit call. namespaces is optional.

* **one** : see **on** above. after this event is called once, it is handler is destroyed.

```js
var private = function() {};

this.proxy(private);
```
* **proxy** : avoid calling private or nested object methods with call/apply with scope association to the instantiated class.

```js
var fidel = new Fidel({ el : $('html') });
this.setElement($('body'));
```
* **setElement** : change or override the fidel element it is instantiated with.

* **onPreInit**/**onPostInit** : hooks to implement fidel plugins.