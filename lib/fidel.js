/*!
 * fidel - a ui view controller
 * v3.0.0-beta.1
 * https://github.com/jgallen23/fidel
 * copyright Greg Allen 2014
 * MIT License
 */

(function(w, $) {
    var _id = 0;
    var $body = $('body');

    var Fidel = function(obj) {
        this.obj = $.extend(true, {}, obj);
    };

    Fidel.prototype.__init = function(options) {
        $.extend(this, this.obj);

        this.id = _id++;
        this.namespace = '.fidel' + this.id;

        $body.trigger('FidelPreInit', this);

        this.setElement(this.el || $('<div/>'));
        this.init && this.init();
        this.hasOwnProperty('filters') && this.filter();

        $body.trigger('FidelPostInit', this);
    };

    Fidel.prototype.setElement = function(el) {
        this.el = el;
    };

    Fidel.prototype.proxy = function(func) {
        return $.proxy(func, this);
    };

    Fidel.prototype.on = function(eventName, cb) {
        this.el.on(eventName + this.namespace, cb);
    };

    Fidel.prototype.one = function(eventName, cb) {
        this.el.one(eventName + this.namespace, cb);
    };

    Fidel.prototype.emit = function(eventName, data, namespaced) {
        var self = this,
            ns = (namespaced) ? this.namespace : '';

        setTimeout(function() {
          self.el.trigger(eventName + ns, data);
        }, 0);
    };

    Fidel.prototype.destroy = function() {
        this.el.empty();
        this.emit('destroy');
        this.el.unbind(this.namespace);
    };

    Fidel.prototype.filter = function() {
        for (var type in this.filters) {
            if (!this.filters.hasOwnProperty(type)) continue;

            for (var filter in this.filters[type]) {
                if (!this.filters[type].hasOwnProperty(filter)) continue;

                for (var i = this.filters[type][filter].length - 1; i >= 0; i--) {
                    var method = this.filters[type][filter][i];

                    this['_' + method] = this[method];
                    this[method] = function() {
                        type === 'before' && this[filter]();
                        this['_' + arguments[arguments.length - 1]].apply(this, arguments);
                        type === 'after' && this[filter]();
                    }
                };
            }
        }
    }

    //for plugins
    Fidel.onPreInit = function(fn) {
        $('body').on('FidelPreInit', function(e, obj) {
            fn.call(obj);
        });
    };

    Fidel.onPostInit = function(fn) {
        $('body').on('FidelPostInit', function(e, obj) {
            fn.call(obj);
        });
    };

    // Public API
    w.fidel = w.fidel || {};
    w.fidel = {
        modules: {},
        collection : function(name, type, obj) {
            return this.suite.build(name, type, obj);
        },
        define: function (name, obj) {
            var FidelModule = function(options) {
                this.obj.defaults = $.extend(true, {}, w.fidel.modules[name].defaults, options.defaults);
                this.__init(options);
            };

            FidelModule.prototype = new Fidel(obj);
            w.fidel.modules[name] = FidelModule;

            if (obj.defaults) {
                w.fidel.modules[name].defaults = $.extend(true, {}, obj.defaults);
            }

            return FidelModule;
        },
        extend : function(name, obj) {
            var target,
                init = obj.hasOwnProperty('init'),
                exec = obj.hasOwnProperty('execute') ? obj.execute : false,
                klass = w.fidel.modules[name].prototype.obj;

            for (var prop in obj) {
                if (!obj.hasOwnProperty(prop)) continue;

                switch(prop) {
                    case 'defaults':
                        target = klass.defaults;
                        $.extend(true, target, obj.defaults);
                    break;
                    case 'elements':
                        target = klass.elements;
                        $.extend(true, target, obj.elements);
                    break;
                    default:
                        klass[prop] = obj[prop];
                    break;
                }

                delete obj[prop];
            }

            !!init && klass.init();
            !!exec && klass[exec]();
        },
        suite : {
            queue : { post : {} },
            build : function(name, type, obj) {
                var FidelModule = this.module(name, type, obj);

                this.submodule(FidelModule);
                this.queue.post.view.model = this.queue.post.model;
                this.queue.post.model.view = this.queue.post.view;

                return FidelModule;
            },
            extend : function(collection, type, object) {
                this.queue[collection] = this.queue[collection] || {};
                this.queue[collection][type] = object;
            },
            module : function(name, type, obj) {
                var FidelModule = function(options) {
                    this.obj.defaults = $.extend(true, {}, w.fidel.modules[name].defaults, obj.defaults);
                    this.__init(options);
                };

                FidelModule.prototype = new Fidel(obj);

                w.fidel.modules[name] = {};
                w.fidel.modules[name] = FidelModule;
                w.fidel.modules[name].defaults = obj.hasOwnProperty('defaults') ? $.extend(true, {}, obj.defaults) : {};

                return FidelModule;
            },
            submodule : function(parent) {
                for (var name in this.queue) {
                    if (!this.queue.hasOwnProperty(name)) continue;

                    for (var type in this.queue[name]) {
                        if (!this.queue[name].hasOwnProperty(type)) continue;

                        var subModule = w.fidel.define(Math.floor(+new Date() * Math.random()), this.queue[name][type]);
                        subModule.prototype.controller = parent.prototype.obj;
                        subModule.prototype[(type === 'view' ? 'model' : 'view')] = null;

                        parent.prototype[type] = new subModule({ el : $('body') });
                        this.queue.post[type] = parent.prototype[type];
                    }
                }
            }
        }
    };

    w.fidel.collection.extend = function(collection, type, object) {
        w.fidel.suite.extend(collection, type, object);
    }
})(window, window.jQuery || window.Zepto););
      };
      FidelModule.prototype = new Fidel(obj);
      w.fidel.modules[name] = FidelModule;

      if (obj.defaults){
        w.fidel.modules[name].defaults = $.extend(true,{},obj.defaults);
      }

      $body.trigger('FidelDefined', [name, obj]);

      return FidelModule;
    },
    modules : {}
  };
  w.Fidel = Fidel;
})(window, window.jQuery || window.Zepto);