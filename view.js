// test modification

/**
 * ViewJS 0.1.0
 * Copyright (c) 2013, Andreas Tietz
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

        // Configure:
        config = config || {};
        self._isRootView                = self.configure(self._isRootView,                  config.isRootView,                  false);
        self._bundle                    = self.configure(self._bundle,                      config.bundle,                      undefined);
        self._container                 = self.configure(self._container,                   config.container,                   undefined);
        self._onViewDidLoad             = self.configure(self._onViewDidLoad,               config.onViewDidLoad,               function () {});
        self._onViewWillUnload          = self.configure(self._onViewWillUnload,            config.onViewWillUnload,            function () {});
        self._parentView                = self.configure(self._parentView,                  config.parentView,                  undefined);

        // DEBUG: set unique id from incremented instance counter:
        /*
        if ( (config.ignoreInstanceCounter === undefined) || (config.ignoreInstanceCounter !== undefined && config.ignoreInstanceCounter === false) ) {
            self.id = View.prototype.instanceCounter += 1;
            //console.log(self.id);
        }
        */

        // Pseudo private/read only properties:
        self._containerElement = undefined;
        self._viewElement = undefined;
        self._childViews = [];
        self._outlets = {};
        self._markupProperties = {};
        self._targetActions = {};
        // Internal state, do not alter:
        self._viewDidLoadCalled = false;
        self._wasAutomaticallyCreated = false;

        // Immediately add this view as a child view of a pre-configured parent view:
        if (self._parentView !== undefined) {
            self._parentView.addChildView(self);
        }

        return self;
    }

    /*
     *  Helper
     */

    //View.prototype.instanceCounter = -1; // DEBUG

    // Helper function for fetching config params into properties and setting defaults.
    View.prototype.configure = function (propertyValue, configValue, defaultValue) {
        // Assign defaultValue if propertyValue is not defined:
        if (propertyValue === undefined) { // better than: propertyValue = propertyValue || defaultValue; // fails when property value is false
            propertyValue = defaultValue;
        }
        // Expect undefined or a function to be configured if the default value is a function:
        if (typeof defaultValue === "function") {
            if (!((typeof configValue === "function") || (configValue === undefined))) {
                throw "[View.prototype.configure] Expected a function (or undefined) as the configuration value.";
            }
        }
        // Assign configValue if defined:
        if (configValue !== undefined) {
            propertyValue = configValue;
        }
        // Return result:
        return propertyValue;
    };

    /*
     *  Lifecycle inheritance interface/notification hooks
     */

    View.prototype.viewDidLoad = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewWillUnload = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewWillAppear = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewDidAppear = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewWillDisappear = function () {
        // optionally override/implement in inherited object
    };

    View.prototype.viewDidDisappear = function () {
        // optionally override/implement in inherited object
    };

    /*
     *  Parent/child view hierarchy management
     */

    // Returns the actual DOM element selected by self._container property - scoped to the
    // parent view DOM if self._parentView is configured and loaded, otherwise selected globally:
    View.prototype._elementForContainer = function () {
        var self = this;
        if (self._container === undefined) {
            return []; // allow evaluation of length property
        }
        var selector = "[data-view-container='" + self._container + "']";
        if (self._parentView !== undefined && self._parentView.isLoaded() === true) {
            return self._parentView.m(selector);
        } else {
            return $(selector);
        }
    };

    // Adds a view to the view hierarchy as a child that will be automatically managed during loading/unloading;
    // Returns a conflicting child view or undefined in case of success:
    View.prototype.addChildView = function (newChildView) {
        var self = this;
        var conflictingChildView;

        // Look for a conflicting child view that wants to occupy the same container as newChildView:
        $.each(self._childViews, function (index, existingChildView) {
            if (existingChildView._container !== undefined && existingChildView._container === newChildView._container) {
                conflictingChildView = existingChildView;
                return false;
            }
        });

        // Ignore attempt to add newChildView subsequently if already existing:
        if (conflictingChildView === newChildView) {
            return newChildView;
        }

        // If conflict exists, ignore adding, notify and return the conflicting child view, otherwise add and return undefined ("no conflict"):
        if (conflictingChildView !== undefined) {
            console.log("[View.prototype.addChildView] Another child view already occupies the same view container.");
            return conflictingChildView;
        } else {
            newChildView._parentView = self;
            self._childViews.push(newChildView);

            // If self is already loaded, load the new child view immediately:
            if (self._viewDidLoadCalled === true) {
                newChildView.load();
            }

            return undefined;
        }
    };

    // Unloads and removes a previously via addChildView added child view from the view hierarchy:
    View.prototype.removeChildView = function (existingChildView) {
        var self = this;
        var childViewRemoved = false;
        $.each(self._childViews, function (index, childView) {
            if (childView === existingChildView) {

                // Unload from DOM:
                childView.unload();

                // Detach parent/child relationship:
                childView.removeAllChildViews();
                childView._parentView = undefined;
                self._childViews.splice(index, 1);

                // Remove outlets that are referencing childView:
                $.each(self._outlets, function (outletKey, outletValue) {
                    if (outletValue === childView) {
                        self._outlets[outletKey] = undefined;
                        // no break here because there might be other outlets referencing childView
                    }
                });

                // TODO: remove properties and target actions
                // Remove all target action events that have a string as their action??
                // -> no, probably better to add a "createdFromDataAttribute"-property to each self._targetActions object

                childViewRemoved = true;
                return false;
            }
        });

        if (childViewRemoved === false) {
            console.log("[View.prototype.removeChildView] View is not a child view.");
        }
    };

    // Removes all child views recursively down the view hierarchy:
    View.prototype.removeAllChildViews = function () {
        var self = this;
        $.each(self._childViews, function (index, childView) {
            childView.removeAllChildViews();
            childView._parentView = undefined;
        });
        self._childViews = [];
        self._outlets = {};
        // TODO: outlets, properties and target actions???
    };

    // Unloads and removes the view from the parent view hierarchy (behaves the same as removeChildView):
    View.prototype.removeFromParentView = function () {
        var self = this;
        if (self._parentView === undefined) {
            throw "[View.prototype.removeFromParentView] View has no parent view.";
        }
        self._parentView.removeChildView(self);
        self._parentView = undefined;
    };

    // Traverses the view hierarchy recursively starting with self and it's child views
    // and invokes a function for each view passing the view and the recursion level:
    View.prototype.traverse = function (fn, level) {
        var self = this;
        if (level === undefined) {
            level = 0;
        }
        fn(self, level);
        $.each(self._childViews, function (index, childView) {
            childView.traverse(fn, level + 1);
        });
    };

    // Returns a string representation of the view:
    // Format: "<constructor name> [<data-view-container attribute value on container element>]"
    View.prototype.toString = function () {
        var self = this;
        var str = self.constructor.name;
        if (self.isLoaded()) {
            str += " [" + self._containerElement.data("view-container") + "]";
        } else {
            str += " [not loaded]";
        }
        return str;
    };

    // Returns the current state of the view hierarchy as a humman readable string.
    View.prototype.getViewHierarchyHumanReadable = function () {
        var self = this;
        var hierarchyOutput = "";
        self.traverse(function (view, level) {
            for (var i = 1; i < level; i++) {
                hierarchyOutput += "|    ";
            }
            if (level > 0) {
                hierarchyOutput += "|--> ";
            }
            hierarchyOutput += view + "\n";
        });
        return hierarchyOutput;
    };

    /*
     *  Target action events
     */

    // Registers a target action event and assigns a specific target and action:
    View.prototype.registerTargetActionEvent = function (eventName, target, action) {
        var self = this;
        self._targetActions[eventName] = {
            "target": target,
            "action": action,
            "trigger": function (params) {
                if (typeof this.action === "function") {
                    this.action(params);
                } else if (typeof this.action === "string") {
                    this.target[this.action].call(this.target, params);
                }
            }
        };
    };

    /*
     *  Markup/DOM management
     */

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

    // Reads values of markup properties from data-property-* attributes on container element into self._markupProperties:
    View.prototype._fetchAttributedPropertiesFromViewContainer = function () {
        var self = this;
        if (self.isLoaded() === true) {
            $.each(self._containerElement.data(), function (propertyName, propertyValue) {
                if (propertyName.substr(0,8) === "property") {
                    // Delete "property" prefix and lowercase first letter:
                    propertyName = propertyName.substr(8, propertyName.length).charAt(0).toLowerCase() + propertyName.slice(9);
                    self._markupProperties[propertyName] = propertyValue;
                    //console.log("'" + propertyName + "' = '" + propertyValue + "'");
                }
            });
        }
    };

    // Reads event names from data-event-* attributes on container element and registeres target action events:
    View.prototype._fetchAttributedTargetActionEventsFromViewContainer = function () {
        var self = this;
        if (self.isLoaded() === true) {
            $.each(self._containerElement.data(), function (eventName, actionName) {
                if (eventName.substr(0,5) === "event") {
                    // Delete "event" prefix and lowercase first letter:
                    eventName = eventName.substr(5, eventName.length).charAt(0).toLowerCase() + eventName.slice(6);
                    self.registerTargetActionEvent(eventName, self._parentView, actionName);
                    //console.log("'" + eventName + "' = '" + actionName + "'");
                }
            });
        }
    };

    // Loads markup from the HTML file specified by self._bundle into the DOM inside of the container
    // element identified by self._container, also loads associated scoped CSS styles from the bundle:
    View.prototype.load = function () {
        var self = this;

        // Except for root views, all views must be part of a view hierarchy:
        if (self._parentView === undefined && self._isRootView === false) {
            throw "[View.prototype.load] View detached from view hierarchy. Attempting to load a view that has no parent view.";
        }

        // If self is already loaded, unload from currently occupied container so that a reload is possible:
        self.unload();

        // Get the container element:
        self._containerElement = self._elementForContainer();

        // In order to be loaded, views need to have a reference to an existing container element:
        if (self._containerElement.length === 0) {
            throw "[View.prototype.load] Error while loading a view into a container: container not specified or the container element is not existent.";
        }

        // If a parent view is configured, make sure that:
        // - the container element is a descendant of the parent view's DOM
        // - the container element is not a descendant of any parent view's other child view containers
        if (self._parentView !== undefined) {
            if (self._containerElement.parents().index(self._parentView._viewElement) < 0) {
                throw "[View.prototype.load] Error while loading a view into a container: the container specified must be a descendant of the parent view's DOM.";
            }
            if (self._containerElement.parents().index(self._parentView._viewElement.find("[data-view-container]")) >= 0) {
                throw "[View.prototype.load] Error while loading a view into a container: the container element must not be a descendant of any other child view container inside the parent view's DOM.";
            }
        }

        // Forbid the view to take over a container that's already hosting another view (runtime check additional to addChildView):
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

            // Parse data-* attributes into properties and target actions:
            self._fetchAttributedPropertiesFromViewContainer();
            self._fetchAttributedTargetActionEventsFromViewContainer();

            // Create a view for each data-load-view attribute occurence inside own DOM:

            var automaticallyPopulatedContainers = self.m("[data-load-view]");
            var containersByViewBundlesToBeLoaded = {}; // key-value with arrays as values

            // Group each container by it's data-load-view (bundle) value:
            automaticallyPopulatedContainers.each(function () {
                var viewContainer = $(this);
                var viewBundle = viewContainer.data("load-view");
                containersByViewBundlesToBeLoaded[viewBundle] = containersByViewBundlesToBeLoaded[viewBundle] || [];
                containersByViewBundlesToBeLoaded[viewBundle].push(viewContainer);
            });

            // Populate RequireJS dependency array from grouped data-load-view bundles:
            var viewBundlesToBeLoaded = [];
            $.each(containersByViewBundlesToBeLoaded, function (bundle, viewContainers) {
                viewBundlesToBeLoaded.push(bundle);
            });

            // Resolve dependencies for view bundles to be loaded:
            if (viewBundlesToBeLoaded.length > 0) {
                require(viewBundlesToBeLoaded, function () {

                    // Each element in arguments array passed to this function by will be the corresponding constructor
                    // function for the view specified at the respective position in the viewBundlesToBeLoaded array:
                    $.each(arguments, function (index, ViewConstructor) {

                        // For each container create and add child views of type <ViewConstructor>:
                        $.each(containersByViewBundlesToBeLoaded[viewBundlesToBeLoaded[index]], function (index, containerElement) {

                            // Automatically create a new child view:
                            var newChildView = new ViewConstructor({
                                container: containerElement.data("view-container")
                            });

                            // If the child view is a plain view, additionally look for a "data-load-bundle" attribute:
                            if (ViewConstructor === View) {
                                newChildView._bundle = containerElement.data("load-bundle");
                            }

                            newChildView._wasAutomaticallyCreated = true;

                            // Add the child view and notify in case of a conflict, otherwise create an outlet connection:
                            var conflictingChildView = self.addChildView(newChildView);
                            if (conflictingChildView !== undefined) { // conflict exists
                                if (conflictingChildView._wasAutomaticallyCreated === false) {
                                    // Presence of user defined view suppresses automatic creation:
                                    console.log("[View.prototype.load] A child view has already been added programmatically for a view container that is defined to be populated with a view automatically. Automatic creation as well as creation of outlet and target actions of the affected view is disabled.");
                                } else {
                                    // Throw away the newly created view in favor of reusing the existing automatically created view (only relevant in case of a reload):
                                    newChildView = conflictingChildView;
                                }
                            } else {
                                // Add an outlet connection if specified by "data-outlet" attribute on container element:
                                var outlet = containerElement.data("outlet");
                                if (outlet !== undefined) {
                                    self._outlets[outlet] = newChildView;
                                }
                            }
                        });
                    });

                    // View is basically loaded, so call load notification on self and on stakeholder:
                    self.viewDidLoad();
                    self._onViewDidLoad(self);
                    self._viewDidLoadCalled = true;

                    // Load child views recursively:
                    $.each(self._childViews, function (index, childView) {
                        childView.load();
                    });
                });
            // Don't need to wait for asynchronous require, view is basically loaded, so call load notification on self and on stakeholder:
            } else {
                self.viewDidLoad();
                self._onViewDidLoad(self);
                self._viewDidLoadCalled = true;

                // Load child views recursively:
                $.each(self._childViews, function (index, childView) {
                    childView.load();
                });
            }
        });

        // Return view object:
        return self;
    };

    // Unloads the DOM by emptying the container:
    View.prototype.unload = function () {
        var self = this;
        if (self.isLoaded()) {

            // Unload child views recursively down the view hierarchy:
            $.each(self._childViews, function (index, childView) {
                childView.unload();
            });

            // Call unload notification method on self and on stakeholder before deleting the view's DOM:
            self.viewWillUnload();
            self._onViewWillUnload(self);
        }

        // Delete the view's DOM while leaving the container intact:
        if (self._containerElement !== undefined) {
            self._containerElement.empty();
        }

        // Release DOM references:
        self._containerElement = undefined;
        self._viewElement = undefined;
        self._markupProperties = {};
        self._viewDidLoadCalled = false;
    };

    // Return the constructor as the module value:
    return View;
}));
