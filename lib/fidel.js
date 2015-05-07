/*!
 * fidel - a ui view controller
 * v3.0.0-beta.1
 * https://github.com/listenrightmeow/fidel
 * heavily forked - @listenrightmeow
 * copyright Greg Allen 2014
 * MIT License
 */

(function(w, $) {
    var _id = 0;
    var $body = $('body');

    var load = function(type) {
        var xhr,
            self = this;

        xhr = $.ajax({
          data : { type : type },
          url : window.location.pathname
        });

        xhr.done(function(data) {
          $.extend(true, self.model, data);

          self.view.render();
        });
    }

    var router = function(collection) {
        var self = this,
            location = window.location.pathname.substr(1).replace(/\/$/, '').split('/'),
            path = '/' + location[0] + '/',
            match = null;

        for (var route in this.routes) {
            var wildcard = route.replace(/\//g, '').match(/[\W]/g);

            if (!wildcard) {
                if (route === window.location.pathname) {
                    match = this.routes[route];
                    break;
                }
            } else {
                wildcard.reverse();

                for (var i = location.length - 1; i >= 1; i--) {
                  path += (wildcard.length > 1 ? wildcard[i - 1] : wildcard[0]) + (!!(i - 1) ? '/' : '');
                };

                if (route === path) {
                    match = this.routes[route];
                    break;
                }
            }
        }

        if (!match) throw new Error('No routes found for : ' + collection);

        template.call(this, function() {
            load.call(self, match);
        });
    };

    var template = function(callback) {
        var self = this,
            templates = [];

        for (var template in this.view.templates) {
            templates.push(template);

            setTimeout(function(tpl) {
                $.ajax({
                    data : { template : self.view.templates[tpl] },
                    url : '/template'
                }).done(function(data) {
                    templates.splice(templates.indexOf(tpl), 1);
                    self.view.templates[tpl] = data;

                    !templates.length && callback();
                });
            }(template), 0);
        }
    }

    var Fidel = function(obj) {
        this.obj = $.extend(true, {}, obj);
    };

    Fidel.prototype.__init = function(options, collection) {
        $.extend(this, this.obj);

        this.id = _id++;
        this.namespace = !!collection ? collection : '.fidel' + this.id;

        $.extend(true, this, this.defaults, options);
        $body.trigger('FidelPreInit', this);

        this.setElement(this.el || $('<div/>'));

        (!!collection && this.routes) && router.call(this, collection);

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
                var opts = Object.keys(options);

                this.obj.defaults = $.extend(true, {}, w.fidel.modules[name].defaults, options.defaults);

                if (opts.length > 1) {
                    for (var i = opts.length - 1; i >= 0; i--) {
                        if (obj.hasOwnProperty(opts[i])) continue;

                        this.obj[opts[i]] = options[opts[i]];
                    };
                }

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
            queue : {},
            build : function(name, type, obj) {
                return this.module(name, type, obj);
            },
            extend : function(collection, type, object) {
                if (type === 'view' && !object.hasOwnProperty('render')) throw new Error(collection + ' ' + type + ' : ' + '\'render\' is a Fidel collection required property to render data to collection view.');

                this.queue[collection] = this.queue[collection] || {};
                this.queue[collection][type] = w.fidel.define(collection + '/' + type, object);
            },
            module : function(name, type, obj) {
                var FidelModule = function(options) {
                    this.obj.defaults = $.extend(true, {}, w.fidel.modules[name + '/controller'].defaults, obj.defaults);

                    // TODO : hard limitation of 'view' not being available on init for model
                    this.model = new w.fidel.suite.queue[name].model({ el : options.el, controller : this });
                    this.model.namespace = name;

                    this.view = new w.fidel.suite.queue[name].view({ el : options.el, controller : this, model : this.model });
                    this.view.namespace = name;

                    this.model.view = this.view;

                    this.__init(options, name);
                };

                FidelModule.prototype = new Fidel(obj);

                w.fidel.modules[name + '/' + type] = FidelModule;
                w.fidel.modules[name + '/' + type].defaults = obj.hasOwnProperty('defaults') ? $.extend(true, {}, obj.defaults) : {};

                return FidelModule;
            }
        }
    };

    w.fidel.collection.extend = function(collection, type, object) {
        w.fidel.suite.extend(collection, type, object);
    }
})(window, window.jQuery || window.Zepto);