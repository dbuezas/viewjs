YUI.add("yuidoc-meta", function(Y) {
   Y.YUIDoc = { meta: {
    "classes": [
        "View"
    ],
    "modules": [
        "ViewJS"
    ],
    "allModules": [
        {
            "displayName": "ViewJS",
            "name": "ViewJS",
            "description": "#ViewJS\n  - JavaScript utility/library that facilitates development of large scale client-side web applications with rich user interfaces\n  - introduces a structural/architectural abstraction layer on top of common client-side web technology (HTML/CSS/JS)\n  - inspired by and built around concepts found in native UI development\n\n##Concept\n\nExamination of a view from different perspectives & definition of terminology:\n\n### View Component (architectural point of view)\n  - a reusable component being instantiated at runtime\n  - consists of a view controller and a bundle\n  - behavior and styling may be extended/overridden/customized by inheritance/cascading\n\n### View Controller (runtime/behavior point of view)\n  - Constructor and prototype object providing common behavior across all instances of a view component\n\n### View Bundle (resource/graphical representation point of view)\n  - collection of resources providing means for a common graphical representation across all instances of a view component\n  - e.g. HTML markup, CSS stylesheet, media resources (e.g. images/audio/video)\n\n### View (general/runtime/instance point of view)\n  - concrete instance of a view component\n  - self-contained/self-managed piece of UI, most like a widget\n  - scoping: managed DOM subtree that has scoped styling and behavior\n  - composition: view instances can be in a parent/child relationship meaning that a view may have one or more other views nested inside of itself. This results in a tree structure, the \"View Hierarchy\"\n  - lifecycle: a view has a lifecycle (construction/instantiation, loading, [showing, hiding, doing stuff], unloading, deallocation)\n  - memory management"
        }
    ]
} };
});