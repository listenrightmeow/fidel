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

    var _history = function(path, hashbang, reset) {
        var params, uri,
            force = (!!path && path.hasOwnProperty('force') && !!path.force),
            self = this;

        if (!!path) {
            if (path.hasOwnProperty('view')) {
                delete path.view;
            }

            if (!!force) {
                delete path.force;
            }

            params = !!Object.keys(path).length ? '?' + $.param(path) : '';9
            uri = window.location.pathname.replace(/\/$/, '') + params;

            if (!hashbang || !!force) {
                uri = window.location.pathname.replace(/\/$/, '').replace(/(\w)+$/, hashbang) + (!!params ? '/' + params : '');
            }
        }

        var separator = /\W$/.test(window.location.pathname) ? '' : '/';
            uri = !!uri ? uri : !!reset ? reset : window.location.pathname + separator + hashbang;

        window.history.pushState('', '', uri);
        window.onpopstate = function(event) {
            self.load();
        }
    }

    var Fidel = function(obj) {
        this.obj = $.extend(true, {}, obj);
    };

    Fidel.prototype.__init = function(options, collection) {
        var self = this;

        $.extend(this, this.obj);

        this.id = _id++;
        this.namespace = !!collection ? '.' + collection + this.id : '.fidel' + this.id;

        $.extend(true, this, this.defaults, options);
        body.trigger('FidelPreInit', this);

        this.setElement(this.el || $('<div/>'));

        if (!!collection && this.hasOwnProperty('routes')) {
            this.router(function(match) {
                self.template(match, false, function() {
                    self.model.load(match, false);
                }); 
            });
        }

        this.init && this.init();
        this.hasOwnProperty('filters') && this.filter();

        body.trigger('FidelPostInit', this);
    };

    Fidel.prototype.destroy = function() {
        this.el.empty();
        this.emit('destroy');
        this.el.unbind(this.namespace);
    };

    Fidel.prototype.emit = function(eventName, data, namespaced) {
        // TODO : detect collection and force namespaced arg
        var self = this,
            ns = (namespaced) ? this.namespace : '';

        setTimeout(function() {
          self.el.trigger(eventName + ns, data);
        }, 0);
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
    };

    Fidel.prototype.history = function(path, hashbang, reset) {
        _history.call(this, path, hashbang, reset);
        this.load();
    };

    Fidel.prototype.load = function() {
        var self = this;

        this.router(function(match) {
            self.template(match, true, function() {
                self.model.load(match, true);
            });
        });
    };

    Fidel.prototype.on = function(eventName, cb) {
        var ns = eventName + this.namespace;
        this.el.off(ns).on(ns, cb);
    };

    Fidel.prototype.one = function(eventName, cb) {
        var ns = eventName + this.namespace;
        this.el.off(ns).one(ns, cb);
    };
    
    Fidel.prototype.proxy = function(func) {
        return $.proxy(func, this);
    };

    Fidel.prototype.router = function(callback) {
        var match,
            location,
            self = this,
            path = '',
            collection = this.namespace.replace(/[\W\d]/g,'');

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

        this.current = match;
        !!callback && callback(this.current);
    };

    Fidel.prototype.setElement = function(el) {
        this.el = el;
    };

    Fidel.prototype.template = function(view, partial, callback) {
        var self = this,
            tmp = [];

        this.view.templates.complete = this.view.templates.complete || [];
        this.view.templates.incomplete = this.view.templates.incomplete || [];

        if (this.view.templates.complete.indexOf(view) === -1) {
            for (var template in this.view.templates[view]) {
                tmp.push(template);
                this.view.templates.complete.push(view);

                var local = $('script[data-mtx-template="' + template + '"]');

                if (!!local.length) {
                    tmp.splice(tmp.indexOf(template), 1);

                    self.view.templates[view][template] = local.text();
                } else {
                    this.view.templates.incomplete.push(template);

                    setTimeout(function(tpl) {
                        $.ajax({
                            data : { template : self.view.templates[view][tpl] },
                            url : '/template'
                        }).done(function(data) {
                            self.view.templates.incomplete.splice(self.view.templates.incomplete.indexOf(tpl), 1);
                            self.view.templates[view][tpl] = data;

                            (!self.view.templates.incomplete.length && !partial) && callback();
                        });
                    }(template), 0);
                }
            }
        }

        if (!!partial) {
            callback();
        } else if (view === 'common') {
            !tmp.length && callback();
        } else {
            this.template('common', null, callback);
        }
    };

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
                this.preflight(name, type, obj);

                return this.module(name, type, obj);
            },
            extend : function(collection, type, object) {
                this.preflight(collection, type, object);
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
            },
            preflight : function(collection, type, object, ctx) {
                var methods = !ctx ? [] : ['current', 'router', 'template'];

                switch(type) {
                    case 'controller':
                        !ctx && methods.push('routes');
                    break;
                    case 'model':
                        !ctx && methods.push('load');
                    break;
                    case 'view':
                        methods = !ctx ? methods.concat(['templates', 'render']) : methods;
                    break;
                }

                methods.map(function(method) {
                    var check = !ctx ? !object.hasOwnProperty(method) : object.hasOwnProperty(method);

                    if (check) {
                        var label = !ctx ? 'required' : 'reserved';

                        throw new Error(collection + '/' + type + ' : ' + method + ' is a ' + label + ' collection property.');
                    }
                });

                !ctx && this.preflight(collection, type, object, true);
            }
        }
    };

    w.fidel.collection.extend = function(collection, type, object) {
        w.fidel.suite.extend(collection, type, object);
    }
})(window, window.jQuery || window.Zepto);