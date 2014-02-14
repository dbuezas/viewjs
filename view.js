/**
 * ViewJS 0.2.1
 * Copyright (c) 2014, Andreas Tietz
 * Released under the MIT license
 */

(function (factory) {
    // Define this module and it's dependencies via AMD if posssible, otherwise use the global scope:
    if (typeof define === "function" && define.amd) {
        define(["jquery"], factory);
    } else {
        View = View || factory(jQuery);
    }
}(function ($) {

    /*
     *  Constructor
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

        // Public (properties):

        // Unique name for the view to be distinguished from other views at the same hierarchy level:
        self.name = config.name;

        // HTML & CSS module/filenames:
        self.bundle = config.bundle;

        // Determines whether this view is the first view in a view hierarchy (has no parent view):
        self.isRootView = config.isRootView;

        // Parent or "owner" of this view:
        self.parentView = config.parentView;

        // Child views "owned" by this view:
        self.childViews = config.childViews;

        // Subscription for viewDidLoad events:
        self.onViewDidLoad = config.onViewDidLoad;

        // Subscription for viewWillUnload events:
        self.onViewWillUnload = config.onViewWillUnload;

        // Private:

        self._viewElement; // loaded view root DOM node (replacement of the original container element)
        self._containerElement; // backup copy of the original container element for restoring upon unloading
    }

    /*
     *  Inheritance
     */

    // Helper function making prototypal inheritance from Views syntactically cleaner:
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

    View.prototype.viewDidLoad = function () {
        // optionally override and implement in inherited view
    };

    View.prototype.viewWillUnload = function () {
        // optionally override and implement in inherited view
    };

    /*
     *  Accessors
     */

    // Helper function for defining properties:
    View.prototype.defineProperty = function (name, accessors) {
        Object.defineProperty(this.constructor.prototype, name, accessors);
    };

    // name:
    View.prototype.defineProperty("name", {
        get: function () { return this._name; },
        set: function (name) {
            if (this.isLoaded) throw "[View->name] Cannot change property while view is loaded.";
            this._name = name;
        }
    });

    // bundle:
    View.prototype.defineProperty("bundle", {
        get: function () { return this._bundle; },
        set: function (bundle) {
            if (this.isLoaded) throw "[View->bundle] Cannot change property while view is loaded.";
            this._bundle = bundle;
        }
    });

    // isRootView:
    View.prototype.defineProperty("isRootView", {
        get: function () { return this._isRootView; },
        set: function (isRootView) {
            if (this.isLoaded) throw "[View->isRootView] Cannot change property while view is loaded.";
            this._isRootView = typeof isRootView !== "undefined" ? isRootView : false;
        }
    });

    // parentView:
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

    // childViews:
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

    // onViewDidLoad:
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

    // onViewWillUnload:
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

    // isLoaded determines whether the view's DOM is currently loaded (true if _viewElement and _containerElement exist):
    View.prototype.defineProperty("isLoaded", {
        get: function () {
            return (this._viewElement && this._viewElement.length > 0 && this._containerElement && this._containerElement.length > 0);
        }
    });

    /*
     *  Markup/DOM management
     */

    // Performs a jQuery selector scoped to the root element of the loaded view:
    // - returns the root element of the loaded view if invoked without parameters
    // - returns undefined if the view is not loaded
    // TODO: don't select deeper than the parent view (ignore inner DOM of child views)
    View.prototype.$ = function (selector) {
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

    // Loads markup from the HTML file specified by self._bundle into the container element
    // identified by self._name, also loads associated scoped CSS styles from the bundle:
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

    // Unloads the DOM by emptying the container:
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

    // Returns a string representation of the view:
    // Format: "<controller/constructor>/<bundle> @[<instance/container/name>]"
    View.prototype.toString = function () {
        var self = this;
        var str = self.constructor.name + (self.constructor.name === self.bundle ? "" : "/" + self.bundle);
        str += (self.isLoaded) ? " @[" + self.name + "]" : str += " @[not loaded]";
        return str;
    };

    // Traverses the view hierarchy recursively starting with self and it's child views
    // and invokes a function for each view passing the view and the recursion level:
    View.prototype.traverse = function (fn, level) {
        var self = this;
        if (level === undefined) level = 0;
        fn(self, level);
        $.each(self._childViews, function (index, childView) {
            childView.traverse(fn, level + 1);
        });
    };

    // Returns the current state of the view hierarchy as a humman readable string:
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
