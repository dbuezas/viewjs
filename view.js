/**
 * ViewJS 0.2.0
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

        // Private attributes with public accessors/properties (see $.extend below):
        self._name;
        self._bundle;
        self._isRootView;
        self._onViewDidLoadCallbacks = $.Callbacks("unique memory");
        self._onViewWillUnloadCallbacks = $.Callbacks("unique memory");

        // Private (internal only) attributes:
        self._viewElement; // loaded view root DOM node (replacement of the original container element)
        self._containerElement; // backup copy of the original container element for restoring upon unloading

        // Configure defaults:
        // - attribute in instance config has highest precedence
        // - if attribute in instance config not defined -> attribute in prototype/self has next highest precedence
        // - if attribute in prototype/self not defined -> attribute in defaults has next highest precedence
        // $.extend(self, defaults, self, config); // not directly possible with jquery, hence the longer solution
        var selfWithDefaults = $.extend({
            // Unique name for the view to be distinguished from other views at the same hierarchy level:
            name: undefined,
            // HTML & CSS module/filenames:
            bundle: undefined,
            // Determines whether this view is the first view in a view hierarchy (has no parent view):
            isRootView: false,
            // Subscription for viewDidLoad events:
            onViewDidLoad: undefined,
            // Subscription for viewWillUnload events:
            onViewWillUnload: undefined
        }, self); // if not already defined on prototype/self -> set default
        $.extend(self, selfWithDefaults); // apply default on self
        $.extend(self, config || {}); // config is king

        return self;
    }

    /*
     *  Inheritance
     */

    // This helper function makes prototypal inheritance from Views syntactically cleaner:
    View.prototype.extend = function (extension) {
        var self = this;

        // Configure defaults:
        extension = $.extend({
            constructor: function (config) {

                // This is a minimal default implementation of a constructor.
                // Please suppy your own as soon as applicable.

                var self = this; // avoid "this" context scoping issues

                // Call the super constructor which initializes/configures
                // the inherited part of this view controller:
                self.super.constructor.call(self, config);

                // Initialize/configure the custom part of this view:
                // TODO: do I need to have such a complex construct like in the View constructor??
                $.extend(self, {
                    // additional options
                }, config);

                return self; // optional
            }
        }, extension);

        // Inherit:
        extension.constructor.prototype = new self.constructor();
        extension.constructor.prototype.constructor = extension.constructor; // correct constructor pointer

        // Merge additional extensions into prototype:
        $.extend(extension.constructor.prototype, extension);

        // Set convenience reference to super:
        extension.constructor.prototype.super = {
            constructor: self.constructor, // original constructor of the object inherited from (before the constructor pointer got corrected)
            object: extension.constructor.prototype // alias for self.prototype
        };

        return extension.constructor; // assignment is optional
    };

    /*
     *  Lifecycle inheritance interface/notification hooks
     */

    View.prototype.viewDidLoad = function () {
        // optionally override and implement in inherited object
    };

    View.prototype.viewWillUnload = function () {
        // optionally override and implement in inherited object
    };

    /*
     *  Accessors
     */

    // name:
    Object.defineProperty(View.prototype, "name", {
        get: function () { return this._name; },
        set: function (name) {
            if (this.isLoaded()) throw "[View->name] Cannot change property while view is loaded.";
            this._name = name;
        }
    });

    // bundle:
    Object.defineProperty(View.prototype, "bundle", {
        get: function () { return this._bundle; },
        set: function (bundle) {
            if (this.isLoaded()) throw "[View->bundle] Cannot change property while view is loaded.";
            this._bundle = bundle;
        }
    });

    // isRootView:
    Object.defineProperty(View.prototype, "isRootView", {
        get: function () { return this._isRootView; },
        set: function (isRootView) {
            if (this.isLoaded()) throw "[View->isRootView] Cannot change property while view is loaded.";
            this._isRootView = isRootView;
        }
    });

    // onViewDidLoad:
    Object.defineProperty(View.prototype, "onViewDidLoad", {
        get: function () {
            return {
                subscribe: this._onViewDidLoadCallbacks.add,
                unsubscribe: this._onViewDidLoadCallbacks.remove
            }
        },
        set: function (subscription) {
            subscription && subscription.subscribe && this._onViewDidLoadCallbacks.add(subscription.subscribe);
        }
    });

    // onViewWillUnload:
    Object.defineProperty(View.prototype, "onViewWillUnload", {
        get: function () {
            return {
                subscribe: this._onViewWillUnloadCallbacks.add,
                unsubscribe: this._onViewWillUnloadCallbacks.remove
            }
        },
        set: function (subscription) {
            subscription && subscription.subscribe && this._onViewWillUnloadCallbacks.add(subscription.subscribe);
        }
    });

    /*
     *  Markup/DOM management
     */

    // Determines whether the view's DOM is currently loaded (true if _viewElement and _containerElement exist):
    View.prototype.isLoaded = function () {
        var self = this;
        return (self._viewElement && self._viewElement.length > 0 && self._containerElement && self._containerElement.length > 0);
    };

    // Performs a jQuery selector scoped to the root element of the loaded view:
    // - returns the root element of the loaded view if invoked without parameters
    // - returns undefined if the view is not loaded
    // TODO: don't select deeper than the parent view (ignore inner DOM of child views)
    View.prototype.$ = function (selector) {
        var self = this;
        if (self.isLoaded()) {
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

        // A unique name must be configured so that the view instance can be distinguished from other views at the same hierarchy level:
        if (!self._name) {
            throw "[View.prototype.load] Error while loading a view into a container: Name not specified.";
        }

        // A bundle must be configured (it must match a valid requirejs module id later on):
        if (!self._bundle) {
            throw "[View.prototype._load] Error while loading a view into a container: (HTML/CSS)-bundle not specified.";
        }

        // If the view is already loaded, unload from currently occupied container element so that a reload is possible:
        self.unload();

        // View is not loaded, so get a backup of the root (container) element identified by [data-view-name] for later use:
        // TODO: don't select deeper than the parent view (ignore inner DOM of child views)
        self._containerElement = $("[data-view-name='" + self._name + "']");

        // In order for a view to get loaded, a valid container element must be existent:
        if (self._containerElement.length === 0) {
            throw "[View.prototype._load] Error while loading a view into a container: Container element not specified or not existent.";
        }

        // Forbid the view to take over a container that's already hosting another view:
        if (self._containerElement.children().length > 0) {
            throw "[View.prototype._load] Error while loading a view into a container: Container is currently occupied by another view. Unload this view explicitly before attempting to load another view into the same container.";
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
        });

        // Return "did load" promise:
        return viewDidLoad.promise();
    };

    // Unloads the DOM by emptying the container:
    View.prototype.unload = function () {
        var self = this;

        var viewWillUnload = $.Deferred();

        // Unload only if loaded:
        if (self.isLoaded()) {

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

    // Return the constructor as the module value:
    return View;
}));
