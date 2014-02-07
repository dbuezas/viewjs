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
        self._container;
        self._bundle;
        self._isRootView;
        self._parentView;
        self._onViewDidLoad;
        self._onViewWillUnload;

        // Public attributes:
        // Requirement:
        // - attribute in instance config has highest precedence
        // - if attribute in instance config not defined -> attribute in prototype/self has next highest precedence
        // - if attribute in prototype/self not defined -> attribute in defaults has next highest precedence
        // $.extend(self, defaults, self, config); // not directly possible with jquery, hence the longer solution
        var selfWithDefaults = $.extend({
            // Container the view should be loaded into:
            container: undefined,
            // HTML & CSS module/filenames:
            bundle: undefined,
            // Determines whether this view is the first view in a view hierarchy (has no parent view):
            isRootView: false,
            // Called when the view has been loaded:
            onViewDidLoad: $.noop,
            // Called before the view is unloaded:
            onViewWillUnload: $.noop
        }, self); // if not already defined on prototype/self -> set default
        $.extend(self, selfWithDefaults); // apply default on self
        $.extend(self, config); // config is king

        // Pseudo private/read only properties:
        self._containerElement = undefined;
        self._viewElement = undefined;

        // Internal state, do not alter:
        self._viewDidLoadCalled = false;

        return self;
    }

    /*
     *  Accessors
     */

    // container:
    Object.defineProperty(View.prototype, "container", {
        get: function () { return this._container; },
        set: function (container) {
            if (this.isLoaded()) throw "[View->container] Cannot change property while view is loaded.";
            this._container = container;
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
        get: function () { return this._onViewDidLoad; },
        set: function (onViewDidLoad) {
            this._onViewDidLoad = onViewDidLoad;
        }
    });

    // onViewWillUnload:
    Object.defineProperty(View.prototype, "onViewWillUnload", {
        get: function () { return this._onViewWillUnload; },
        set: function (onViewWillUnload) {
            this._onViewWillUnload = onViewWillUnload;
        }
    });

    /*
     *  Lifecycle inheritance interface/notification hooks
     */

    View.prototype.viewDidLoad = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewWillUnload = function () {
        // optionally override/implement in inherited object
    };

    /*
     *  Markup/DOM management
     */

    // Returns the actual DOM element globally selected by self._container property:
    View.prototype._elementForContainer = function () {
        var self = this;
        if (self._container === undefined) {
            return []; // allow evaluation of length property
        }
        return $("[data-view-container='" + self._container + "']");
    };

    // Determines wether the view's DOM is currently loaded (true if containerElement and viewElement exist):
    View.prototype.isLoaded = function () {
        var self = this;
        return ( (self._containerElement !== undefined ) && (self._viewElement !== undefined ) );
    };

    // Helper method for performing a jQuery selector scoped to the inner DOM ("m"arkup) of the view:
    // - self.m() without parameters will return the root DOM node of the view
    // - if the view is not loaded, undefined will be returned
    View.prototype.m = function (selector) {
        var self = this;
        if (selector !== undefined && self.isLoaded()) {
            return self._viewElement.find(selector);
        }
        return self._viewElement;
    };

    // Loads markup from the HTML file specified by self._bundle into the DOM inside of the container
    // element identified by self._container, also loads associated scoped CSS styles from the bundle:
    View.prototype.load = function () {
        var self = this;

        // If self is already loaded, unload from currently occupied container so that a reload is possible:
        self.unload();

        // Get the container element:
        self._containerElement = self._elementForContainer();

        // In order to be loaded, views need to have a reference to an existing container element:
        if (self._containerElement.length === 0) {
            throw "[View.prototype.load] Error while loading a view into a container: container not specified or the container element is not existent.";
        }

        // Forbid the view to take over a container that's already hosting another view:
        if (self._containerElement.children().length > 0) {
            throw "[View.prototype.load] Error while loading a view into a container: the container is currently occupied by another view. Unload this view explicitly before attempting to load another view into the same container.";
        }

        // A bundle must be configured at this point of the loading process (reject loading an undefined bundle):
        // Note: The bundle must match a valid requirejs module id.
        if (self._bundle === undefined) {
            throw "[View.prototype.load] Error while loading a view into a container: (HTML/CSS)-bundle not specified.";
        }

        // Load equally named HTML markup and CSS stylesheet files via require loader plugins (they can only be loaded paired/they must have the same file name):
        require(["html!" + self._bundle + ".html", "css!" + self._bundle], function (html, css) {

            // Load HTML into DOM inside of the container element:
            self._containerElement.html(html);

            // Apply own DOM reference expecting a single element as the root node:
            self._viewElement = self._containerElement.children().eq(0);

            // View is basically loaded, so call load notification on self and on stakeholder:
            self.viewDidLoad();
            self.onViewDidLoad(self);
            self._viewDidLoadCalled = true;
        });

        // Return view object:
        return self;
    };

    // Unloads the DOM by emptying the container:
    View.prototype.unload = function () {
        var self = this;
        if (self.isLoaded()) {

            // Call unload notification method on self and on stakeholder before deleting the view's DOM:
            self.viewWillUnload();
            self.onViewWillUnload(self);
        }

        // Delete the view's DOM while leaving the container intact:
        if (self._containerElement !== undefined) {
            self._containerElement.empty();
        }

        // Release DOM references:
        self._containerElement = undefined;
        self._viewElement = undefined;
        self._viewDidLoadCalled = false;
    };

    // Return the constructor as the module value:
    return View;
}));
