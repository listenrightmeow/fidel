# FIDEL COLLECTION

fidel.collection is a public API method to make managing SPAs (Single Page Applications) simple.

### SCAFFOLDING

Fidel will automatically instantiate both the model and view when the class is instantiated.


### RESERVED/REQUIRED PROPERTIES

```js
fidel.collection.extend('collection', 'view', {
  templates : {
    index : {
      header : '/path/to/header',
      footer : '/path/to/footer'
    },
    secondary : {
      secondary : '/path/to/secondary'
    },
    tertiary : {
      tertiary : '/path/to/tertiary'
    }
  },
  render : function() {
    var self = this;

    for (var template in this.templates[this.current]) {
      Mustache.render(this.templates[template], this.model, {
        header : this.templates.index.header,
        footer : this.templates.index.footer
      });
    }
  }
});

fidel.collection.extend('collection', 'model', {
  load : function() {
    var self = this,
        xhr = $.ajax(...);

    xhr.done(function(data) {
      $.extend(true, self, data);

      self.view.render();
      self.emit(data);
    });
  }
});

var Collection = fidel.collection('collection', 'controller', {
  routes : {
    '*' : 'index',
    '/secondary/*' : 'secondary',
    '*/*/*' : 'tertiary'
  }
});

collection = new Collection({el : $('body')});
collection.on('data', function(event, data) {});
```
* **controller** : routes object will house fully qualified pathnames or wildcard pathnames that will directly correlate the templates object in the view.
* **model** : load will be required to house all outbound xhr requests to retrieve data.
* **view** : templates will house objects for expected routes in the controller. define the template key and a path to retrieve that template as the value. the value of the template will be overwritten with the template itself when it is retrieved.
* **reserved** : current, router and template are all reserved properties within the fidel collection.

### INSTANTIATION

Load the view and model as dependencies of the controller. This is required. The model and view are auto instantiated and appropriately namespaced to the collection.
Through loading libraries like requirejs or almond this is easily achievable.

### KNOWN ISSUES

* The model does not have scope to the controller in the init method.
* Mustache is currently hard-coded as the templating engine in fidel.
* The templating caching strategy is hard-coded to the data attribute `mtx-template`
* The templating path to retrieve templates is hard-coded.

### SCOPE

```js
this.controller
this.model
this.view
```

The model, view and controller all have referrences to each other respectively.
This allows the end user to call render in the view directly without worrying about emitting an event to handle the functionality through the instantiation properties of the collection.

### FLOW OF OPERATION

| METHOD       | DESCRIPTION  |
| ------------ | ------------ |
| fidel.suite.preflight | Preflight will verify that no required properties are missing nor any reserved properties exist in your collection.
| this.router | this method will verify if the current page matches a pattern in the controller
| this.template | this method will attempt to load templates defined in the view via DOM query or via xhr. If you are loading a preflight html response and would like to serve templates from that response : set a data attribute `mtx-template` with a value that matches the template key property.
| this.model.load | after the route is found and all the templates are loaded, your model should have a load method that will be capable of loading data. in the xhr callback, the example above shows a call to the render method housed in the view.

### CONVENIENCE PROPERTIES

| PROPERTY       | DESCRIPTION    |
| -------------- | -------------- |
| this.current |  when a route is met, fidel will set the current namespace to the current route loaded in the client environment.
