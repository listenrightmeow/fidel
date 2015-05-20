/*!
 * fidel - a ui view controller
 * v3.0.0-beta.1
 * https://github.com/listenrightmeow/fidel
 * heavily forked - @listenrightmeow
 * copyright Greg Allen 2014
 * MIT License
 */

(function(w, $) {
    var _id = 0,
        body = $('body');

    var _history = function(path, hashbang) {
        var params, uri,
            self = this;

        if (!!path) {
            if (path.hasOwnProperty('view')) {
                delete path.view;
            }

            if (path.hasOwnProperty('q') && !path.q) {
                delete path.q;
            }

            params = !!Object.keys(path).length ? '?' + $.param(path) : '';
            path = window.location.pathname.replace(/\/$/, '') + params;
        }

        var uri = !!path ? path : window.location.pathname + '/#!' + hashbang;

        window.history.pushState('', '', uri);
        window.onpopstate = function(event) {
            self.defaults.path.current = uri;
        }
    }

    var _load = function(type) {
        var xhr,
            self = this;

        xhr = $.ajax({
          data : $.extend({view:type}, tradesyApp.common.tradesy.defaults.params),
          url : window.location.pathname
        });

        xhr.done(function(data) {
          $.extend(true, self.model, data);

          self.view.render(type);
          self.emit('ready');
        });
    };

    var _router = function(collection) {
        var match,
            location,
            self = this,
            path = '';

        for (var route in this.routes) {
            var location = window.location.pathname.replace(/(^\/|\/$)/, '').split('/'),
                uri = route.replace(/^\//,''),
                wildcard = uri.split('/'),
                trailing = location.indexOf('');

            trailing > -1 && location.splice(trailing, 1);

            if (location.length !== wildcard.length) continue;

            if (!wildcard) {
                if (route === window.location.pathname) {
                    match = this.routes[route];
                    break;
                }
            } else {
                for (var i = 0; i < location.length; i++) {
                    if (!!location[i] && (/\W/.test(wildcard[i]) || wildcard[i] === location[i])) {
                        path += (i + 1 === location.length) ? wildcard[i] : wildcard[i] + '/';
                    } else {
                        break;
                    }
                };

                match = (uri === path) ? this.routes[route] : null;
            }
        }

        if (!match) throw new Error('No routes found for : ' + collection);

        _template.call(this, match, function() {
            _load.call(self, match);
        });
    };

    var _template = function(view, callback) {
        var self = this,
            tmp = [];

        for (var template in this.view.templates[view]) {
            tmp.push(template);

            var local = $('script[data-mtx-template="' + template + '"]');

            if (!!local.length) {
                tmp.splice(tmp.indexOf(template), 1);

                self.view.templates[view][template] = local.text();
            } else {
                setTimeout(function(tpl) {
                    $.ajax({
                        data : { template : self.view.templates[view][tpl] },
                        url : '/template'
                    }).done(function(data) {
                        tmp.splice(tmp.indexOf(tpl), 1);
                        self.view.templates[view][tpl] = data;

                        !tmp.length && callback();
                    });
                }(template), 0);
            }
        }

        if (view === 'common') {
            !tmp.length && callback();
        } else {
            _template.call(this, 'common', callback);
        }
    };

    var Fidel = function(obj) {
        this.obj = $.extend(true, {}, obj);
    };

    Fidel.prototype.__init = function(options, collection) {
        $.extend(this, this.obj);

        this.id = _id++;
        this.namespace = !!collection ? '.' + collection + this.id : '.fidel' + this.id;

        $.extend(true, this, this.defaults, options);
        body.trigger('FidelPreInit', this);

        this.setElement(this.el || $('<div/>'));

        (!!collection && this.routes) && _router.call(this, collection);

        this.init && this.init();
        this.hasOwnProperty('filters') && this.filter();

        body.trigger('FidelPostInit', this);
    };

    Fidel.prototype.history = function(path, hashbang) {
        _history.call(this, path, hashbang);
    }

    Fidel.prototype.setElement = function(el) {
        this.el = el;
    };

    Fidel.prototype.proxy = function(func) {
        return $.proxy(func, this);
    };

    Fidel.prototype.on = function(eventName, cb) {
        var ns = eventName + this.namespace;
        this.el.off(ns).on(ns, cb);
    };

    Fidel.prototype.one = function(eventName, cb) {
        var ns = eventName + this.namespace;
        this.el.off(ns).one(ns, cb);
    };

    Fidel.prototype.emit = function(eventName, data, namespaced) {
        // TODO : detect collection and force namespaced arg
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
                    this.view = new w.fidel.suite.queue[name].view({ el : options.el, controller : this, model : this.model });

                    this.model.view = this.view;

                    this.__init(options, name);

                    this.model.namespace = this.view.namespace = this.namespace;
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