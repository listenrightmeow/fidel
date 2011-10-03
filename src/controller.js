(function(f) {
  var eventSplitter = /^(\w+)\s*(.*)$/;

  var ViewController = f.Class.extend({
    _initialize: function(options) {

      if (!this.el) throw "el is required";
      
      this._subscribeHandles = {};
      if (this.events) this.delegateEvents();
      if (this.elements) this.refreshElements();
      if (this.templates) this.loadTemplates();
      if (!this.actionEvent) this.actionEvent = "click";
      if (this.subscribe) this.bindSubscriptions();
      this.delegateActions();
      this.getDataElements();
    },
    template: (window.str)?window.str.template:null,
    delegateEvents: function() {
      for (var key in this.events) {
        var methodName = this.events[key];
        var match = key.match(eventSplitter);
        var eventName = match[1], selector = match[2];

        var method = this.proxy(this[methodName]);

        if (selector === '') {
          this.el.bind(eventName, method);
        } else {
          this.el.delegate(selector, eventName, method);
        }
      }
    },
    delegateActions: function() {
      var self = this;
      this.el.delegate('[data-action]', this.actionEvent, function(e) {
        var el = $(this);
        var methodName = el.attr('data-action');
        if (self[methodName]) self[methodName].call(self, el);
      });
    },
    refreshElements: function() {
      for (var key in this.elements) {
        this[key] = this.find(this.elements[key]);
      }
    },
    getDataElements: function() {
      var self = this;
      var elements = this.find("[data-element]");
      for (var i = 0, c = elements.length; i < c; i++) {
        var name = elements[i].getAttribute('data-element');
        if (!self[name]) {
          var elem = this.find('[data-element="'+name+'"]');
          self[name] = elem;
        }
      }
    },
    bindSubscriptions: function() {
      for (var key in this.subscribe) {
        this._subscribeHandles[key] = Fidel.subscribe(key, this.proxy(this[this.subscribe[key]]));
      }
    },
    loadTemplates: function() {
      for (var name in this.templates) {
        this.templates[name] = $(this.templates[name]).html();
      }
    },
    find: function(selector) {
      return $(selector, this.el[0]);
    },
    render: function(template, data, selector) {
      if (arguments.length == 1) {
        data = template;
        template = this.templates[this.primaryTemplate];
      }
      var tmp = this.template(template, data);
      selector = (selector)?$(selector):this.el;
      selector.html(tmp);
    },
    destroy: function() {
      for (var key in this._subscribeHandles) {
        Fidel.unsubscribe(this._subscribeHandles[key]);
      }
      this.el.undelegate('[data-action]', this.actionEvent);
      this.el = null;
    }
  });
  f.ViewController = ViewController;
})(Fidel || this);