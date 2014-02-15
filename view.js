/**
 * viewjs 0.2.1
 * Copyright (c) 2014, Andreas Tietz
 * Released under the MIT license
 */

/**
 *  #ViewJS
 *    - JavaScript utility/library that facilitates development of large scale client-side web applications with rich user interfaces
 *    - introduces a structural/architectural abstraction layer on top of common client-side web technology (HTML/CSS/JS)
 *    - inspired by and built around concepts found in native UI development
 *
 *  ##Concept
 *
 *  Examination of a view from different perspectives & definition of terminology:
 *
 *  ### View Component (architectural point of view)
 *    - a reusable component being instantiated at runtime
 *    - consists of a view controller and a bundle
 *    - behavior and styling may be extended/overridden/customized by inheritance/cascading
 *
 *  ### View Controller (runtime/behavior point of view)
 *    - Constructor and prototype object providing common behavior across all instances of a view component
 *
 *  ### View Bundle (resource/graphical representation point of view)
 *    - collection of resources providing means for a common graphical representation across all instances of a view component
 *    - e.g. HTML markup, CSS stylesheet, media resources (e.g. images/audio/video)
 *
 *  ### View (general/runtime/instance point of view)
 *    - concrete instance of a view component
 *    - self-contained/self-managed piece of UI, most like a widget
 *    - scoping: managed DOM subtree that has scoped styling and behavior
 *    - composition: view instances can be in a parent/child relationship meaning that a view may have one or more other views nested inside of itself. This results in a tree structure, the "View Hierarchy"
 *    - lifecycle: a view has a lifecycle (construction/instantiation, loading, [showing, hiding, doing stuff], unloading, deallocation)
 *    - memory management
 *
 *  @author Andreas Tietz
 *  @module ViewJS
 *  @requires RequireJS, jQuery
 */
(function (factory) {
    // Define this module and it's dependencies via AMD if posssible, otherwise use the global scope:
    if (typeof define === "function" && define.amd) {
        define(["jquery"], factory);
    } else {
        View = View || factory(jQuery);
    }
}(function ($) {

    /**
     *  Base implementation of a view controller providing scoped and configurable behavior across all instances of a view component.
     *
     *  @class View
     *  @constructor
     */
    function View(config) {
        var self = this;

        // Allow the constructor function to be invoked without the "new" operator
        // which would otherwise cause "this" to be bound to the global object:
        if ((self instanceof View) === false) {
            return new View(config);
        }

        // Lazily initialize the config hash:
        config = config || {};

        // Initially assign properties from config:
        self.name = config.name;
        self.bundle = config.bundle;
        self.isRootView = config.isRootView;
        self.parentView = config.parentView;
        self.childViews = config.childViews;
        self.onViewDidLoad = config.onViewDidLoad;
        self.onViewWillUnload = config.onViewWillUnload;
    }

    /*
     *  Inheritance
     */

    /**
     *  Helper function that facilitates prototypal inheritance from Views.
     *
     *  Note: Assign a name to the passed in constructor function in order for it to be correctly printed out in console logs.
     *
     *  @method extend
     *  @param {Mixed} [extension] Prototype attributes and methods being added to the view prototype to be inherited from.
     *  @return {Function} Constructor of the extended/inherited view.
     *  @example
     *      var MyView = View.prototype.extend({
     *          constructor: function MyView (config) {..},
     *          viewDidLoad: function () {..},
     *          myNewFunction: function () {..}
     *          myNewAttribute: ..
     *          ...
     *      };
     */
    View.prototype.extend = function (extension) {
        var self = this;

        // Configure extension defaults:
        extension = $.extend({
            constructor: function (config) { self.super.constructor.call(this, config); },
        }, extension);

        // Copy constructor properties:
        for (var key in self.constructor) {
            if ({}.hasOwnProperty.call(self.constructor, key)) extension.constructor[key] = self.constructor[key];
        };

        // Build prototype constructor (avoids calling extension.constructor):
        function PrototypeConstructor() {
            this.constructor = extension.constructor;
        };
        PrototypeConstructor.prototype = self.constructor.prototype;

        // Inherit prototype:
        extension.constructor.prototype = new PrototypeConstructor();
        extension.constructor.prototype.super = self.constructor.prototype;

        // Merge additional extensions into prototype:
        $.extend(extension.constructor.prototype, extension);

        return extension.constructor; // assignment is optional
    };

    /*
     *  Lifecycle inheritance interface/notification hooks
     */

    /**
     *  Function being called on the view itself when the "view did load" event occurs.
     *
     *  Inherited views may override and implement this function.
     *
     *  @method viewDidLoad
     */
    View.prototype.viewDidLoad = function () {
        // optionally override and implement in inherited view
    };

    /**
     *  Function being called on the view itself when the "view will unload" event occurs.
     *
     *  Inherited views may override and implement this function.
     *
     *  @method viewWillUnload
     */
    View.prototype.viewWillUnload = function () {
        // optionally override and implement in inherited view
    };

    /*
     *  Public attributes, properties and accessors
     */

    /**
     *  Helper function for defining properties.
     *
     *  @method defineProperty
     *  @param {String} [name] Name of the property.
     *  @param {Mixed} [accessors] Object defining set and get functions.
     */
    View.prototype.defineProperty = function (name, accessors) {
        Object.defineProperty(this.constructor.prototype, name, accessors);
    };

    /**
     *  Unique name for the view to be distinguished from other views at the same hierarchy level.
     *
     *  @property name
     *  @type String
     *  @default undefined
     */
    View.prototype.defineProperty("name", {
        get: function () { return this._name; },
        set: function (name) {
            if (this.isLoaded) throw "[View->name] Cannot change property while view is loaded.";
            this._name = name;
        }
    });

    /**
     *  HTML & CSS module/filenames.
     *
     *  @property bundle
     *  @type String
     *  @default undefined
     */
    View.prototype.defineProperty("bundle", {
        get: function () { return this._bundle; },
        set: function (bundle) {
            if (this.isLoaded) throw "[View->bundle] Cannot change property while view is loaded.";
            this._bundle = bundle;
        }
    });

    /**
     *  Determines whether the view is the first view in a view hierarchy and therefore has no parent view.
     *
     *  @property isRootView
     *  @type Boolean
     *  @default false
     */
    View.prototype.defineProperty("isRootView", {
        get: function () { return this._isRootView; },
        set: function (isRootView) {
            if (this.isLoaded) throw "[View->isRootView] Cannot change property while view is loaded.";
            this._isRootView = typeof isRootView !== "undefined" ? isRootView : false;
        }
    });

    /**
     *  Parent view up the view hierarchy that "owns" the view.
     *
     *  @property parentView
     *  @type View
     *  @default undefined
     */
    View.prototype.defineProperty("parentView", {
        get: function () { return this._parentView; },
        set: function (parentView) {
            if (this.isLoaded) throw "[View->parentView] Cannot change property while view is loaded.";
            if (!this.isRootView) {
                this._parentView = parentView;
                if (typeof this._parentView !== "undefined") {
                    this._parentView.childViews.push(this); // TODO: only add if not already there
                }
            }
        }
    });

    /**
     *  Direct child views down the view hierarchy "owned" by the view.
     *
     *  @property childViews
     *  @type Array of Views
     *  @default []
     */
    View.prototype.defineProperty("childViews", {
        get: function () { return this._childViews || []; },
        set: function (childViews) {
            var self = this;
            if (self.isLoaded) throw "[View->childViews] Cannot change property while view is loaded.";
            self._childViews = self._childViews || [];
            childViews = childViews || [];
            // Detach current child views from self:
            $.each(self._childViews, function (index, childView) {
                childView._parentView = undefined;
            });
            // Remove current child views (release all references):
            self._childViews.length = 0;
            // Add new child views:
            $.each(childViews, function (index, childView) {
                childView._parentView = self;
                self._childViews.push(childView); // TODO: only add if not already there
            });
        }
    });

    /**
     *  Subscription for "view did load" events.
     *
     *  @property onViewDidLoad
     *  @type Mixed
     *  @default {
     *               subscribe: Function
     *               unsubscribe: Function
     *           }
     */
    View.prototype.defineProperty("onViewDidLoad", {
        get: function () {
            this._onViewDidLoadCallbacks = this._onViewDidLoadCallbacks || $.Callbacks("unique memory");
            return {
                subscribe: this._onViewDidLoadCallbacks.add,
                unsubscribe: this._onViewDidLoadCallbacks.remove
            }
        },
        set: function (subscription) {
            this._onViewDidLoadCallbacks = this._onViewDidLoadCallbacks || $.Callbacks("unique memory");
            subscription && subscription.subscribe && this._onViewDidLoadCallbacks.add(subscription.subscribe);
        }
    });

    /**
     *  Subscription for "view will unload" events.
     *
     *  @property onViewWillUnload
     *  @type Mixed
     *  @default {
     *               subscribe: Function
     *               unsubscribe: Function
     *           }
     */
    View.prototype.defineProperty("onViewWillUnload", {
        get: function () {
            this._onViewWillUnloadCallbacks = this._onViewWillUnloadCallbacks || $.Callbacks("unique memory");
            return {
                subscribe: this._onViewWillUnloadCallbacks.add,
                unsubscribe: this._onViewWillUnloadCallbacks.remove
            }
        },
        set: function (subscription) {
            this._onViewWillUnloadCallbacks = this._onViewWillUnloadCallbacks || $.Callbacks("unique memory");
            subscription && subscription.subscribe && this._onViewWillUnloadCallbacks.add(subscription.subscribe);
        }
    });

    /*
     *  Private attributes
     */

    /**
     *  Backup copy of the original container element to be restored when unloading.
     *
     *  @property _containerElement
     *  @private
     *  @type jQuery Element
     */
    View.prototype._containerElement;

    /**
     *  Loaded view root DOM node (replacement of the original container element).
     *
     *  @property _viewElement
     *  @private
     *  @type jQuery Element
     */
    View.prototype._viewElement;

    /**
     *  Determines whether the view's DOM is currently loaded.
     *
     *  @property isLoaded
     *  @readOnly
     *  @type Boolean
     *  @default false
     */
    View.prototype.defineProperty("isLoaded", {
        get: function () {
            // true if _viewElement and _containerElement exist:
            return (this._viewElement && this._viewElement.length > 0 && this._containerElement && this._containerElement.length > 0);
        }
    });

    /*
     *  Markup/DOM management
     */

    /**
     *  Performs a jQuery selector scoped to the root element of a loaded view.
     *
     *  @method $
     *  @param {String} [selector] jQuery selector being scoped to the root element.
     *  @return {jQuery Element} Root element of a loaded view if invoked without a parameter,
     *                           scoped jQuery selection result if invoked with a selector
     *                           or undefined if the view is not loaded.
     */
    View.prototype.$ = function (selector) {
        // TODO: don't select deeper than the parent view (ignore inner DOM of child views)
        var self = this;
        if (self.isLoaded) {
            return selector ? self._viewElement.find(selector) : self._viewElement;
        } else { // view not loaded
            if (selector) { // selector specified
                throw "[View.prototype.$] Error while selecting inner elements of a view: View is not loaded.";
            } else { // selecting root element
                return []; // view is not loaded
            }
        }
    };

    /**
     *  Loads markup and styles from HTML and CSS files specified by the bundle property into the container element identified by the name property.
     *
     *  @method load
     *  @return {jQuery Deferred Promise} Promise for the "view did load" state.
     */
    View.prototype.load = function () {
        var self = this;

        // Skip if parent view is not loaded yet:
        if (self._parentView && !self._parentView.isLoaded) {
            throw "[View.prototype.load] Error while loading a view into a container: Parent view is not loaded yet.";
        }

        // A unique name must be configured so that the view instance can be distinguished from other views at the same hierarchy level:
        if (!self._name) {
            throw "[View.prototype.load] Error while loading a view into a container: Name not specified.";
        }

        // A bundle must be configured (it must match a valid requirejs module id later on):
        if (!self._bundle) {
            throw "[View.prototype.load] Error while loading a view into a container: (HTML/CSS)-bundle not specified.";
        }

        // Except for root views, all views must be part of a view hierarchy:
        if (!self._isRootView && !self._parentView) { // declared as child view but no parent view configured
            console.log(self)
            throw "[View.prototype.load] Error while loading a view into a container: View detached from view hierarchy. Attempting to load a view that has no parent view. Only root views are allowed to do that.";
        }

        // If the view is already loaded, unload from currently occupied container element so that a reload is possible:
        self.unload();

        // View is not loaded, so get a backup of the root (container) element identified by [data-view-name] for later use:
        // TODO: don't select deeper than the parent view (ignore inner DOM of child views)
        var containerElementSelector = "[data-view-name='" + self._name + "']";
        self._containerElement = ( self._parentView ? self._parentView.$(containerElementSelector) : $(containerElementSelector) );

        // In order for a view to get loaded, a valid container element must be existent:
        if (self._containerElement.length === 0) {
            throw "[View.prototype.load] Error while loading a view into a container: Container element not specified or not existent.";
        }

        // Forbid the view to take over a container that's already hosting another view:
        if (self._containerElement.children().length > 0) {
            throw "[View.prototype.load] Error while loading a view into a container: Container is currently occupied by another view. Unload this view explicitly before attempting to load another view into the same container.";
        }

        // If a parent view is configured, make sure that:
        // - the container element is a descendant of the parent view's DOM
        // - the container element is not a descendant of any parent view's other child view containers
        if (self._parentView) {
            if (self._containerElement.parents().index(self._parentView._viewElement) < 0) {
                throw "[View.prototype.load] Error while loading a view into a container: Container element must be a descendant of the parent view's DOM.";
            }
            if (self._containerElement.parents().index(self._parentView._viewElement.find("[data-view-container]")) >= 0) {
                throw "[View.prototype.load] Error while loading a view into a container: Container element must not be a descendant of any other child view container inside the parent view's DOM.";
            }
        }

        var viewDidLoad = $.Deferred();

        // Load equally named HTML markup and CSS stylesheet files via require loader plugins (they can only be loaded paired/they must have the same file name):
        require(["html!" + self._bundle + ".html", "css!" + self._bundle], function (html, css) {

            // The new view element is based on the container element:
            self._viewElement = self._containerElement;

            // Retain a copy of the original container element for restoring upon unloading:
            self._containerElement = self._containerElement.clone();

            // Replace the container element with the loaded view's root element:
            var $html = $(html);
            self._viewElement.replaceWith($html);
            self._viewElement = $html; // TODO: find out why this is necessary (why replaceWith doesn't suffice)

            // Copy the original container's properties over to the view element:
            self._viewElement.addClass(self._containerElement[0].className);
            self._viewElement.attr("data-view-name", self._containerElement.attr("data-view-name"));

            // Set type of view controller for scoping purposes:
            self._viewElement.attr("data-view-controller", self.constructor.name);

            // Call "did load" notification on self and on subscribed stakeholders:
            self.viewDidLoad();
            self._onViewDidLoadCallbacks.fire(self);
            viewDidLoad.resolve(self);

            // Load child views recursively:
            $.each(self._childViews, function (index, childView) {
                childView.load();
            });
        });

        // Return "did load" promise:
        return viewDidLoad.promise();
    };

    /**
     *  Unloads the DOM by emptying the container.
     *
     *  @method unload
     *  @return {jQuery Deferred Promise} Promise for the "view will unload" state.
     */
    View.prototype.unload = function () {
        var self = this;

        var viewWillUnload = $.Deferred();

        // Unload only if loaded:
        if (self.isLoaded) {

            // Unload child views recursively down the view hierarchy:
            $.each(self._childViews, function (index, childView) {
                childView.unload();
            });

            // Call "will unload" notification on self and on subscribed stakeholders:
            self.viewWillUnload();
            self._onViewWillUnloadCallbacks.fire(self);
            viewWillUnload.resolve(self);

            // Delete the view's DOM by restoring the original container element:
            self._viewElement.replaceWith(self._containerElement);

            // Release DOM references:
            self._containerElement = undefined;
            self._viewElement = undefined;
        }

        // Return "will unload" promise:
        return viewWillUnload.promise();
    };

    /*
     *  Debugging
     */

    /**
     *  Provides a human readable string representation of a view.
     *
     *  @method toString
     *  @return {String} String representation of the view.
     *  @example
     *      Format: "<controller/constructor name>/<bundle name> @[<instance/container name>]"
     */
    View.prototype.toString = function () {
        var self = this;
        var str = self.constructor.name + (self.constructor.name === self.bundle ? "" : "/" + self.bundle);
        str += (self.isLoaded) ? " @[" + self.name + "]" : str += " @[not loaded]";
        return str;
    };

    /**
     *  Recursively traverses down the child view hierarchy of a view while invoking
     *  a function for each view passing it the view and the recursion level.
     *
     *  @method traverse
     *  @param {Function} fn Function being invoked for each view and being passed the view object and the recursion level.
     *  @param {Number} level Indicates the current level of recursion.
     */
    View.prototype.traverse = function (fn, level) {
        var self = this;
        if (level === undefined) level = 0;
        fn(self, level);
        $.each(self._childViews, function (index, childView) {
            childView.traverse(fn, level + 1);
        });
    };

    /**
     *  Provides a human readable string representation of the current state of the child view hierarchy.
     *
     *  @method getViewHierarchyHumanReadable
     *  @return {String} String representation of the child view hierarchy.
     */
    View.prototype.getViewHierarchyHumanReadable = function () {
        var self = this;
        var hierarchyOutput = "";
        self.traverse(function (view, level) {
            for (var i = 1; i < level; i++) hierarchyOutput += "|    ";
            if (level > 0) hierarchyOutput += "|--> ";
            hierarchyOutput += view + "\n";
        });
        return hierarchyOutput;
    };

    // Return the constructor as the module value:
    return View;
}));
