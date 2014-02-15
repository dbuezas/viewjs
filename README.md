#ViewJS
  - JavaScript utility/library that facilitates development of large scale client-side web applications with rich user interfaces
  - introduces a structural/architectural abstraction layer on top of common client-side web technology (HTML/CSS/JS)
  - inspired by and built around concepts found in native UI development

##Concept

Examination of a view from different perspectives & definition of terminology:

### View Component (architectural point of view)
  - a reusable component being instantiated at runtime
  - consists of a view controller and a bundle
  - behavior and styling may be extended/overridden/customized by inheritance/cascading

### View Controller (runtime/behavior point of view)
  - Constructor and prototype object providing common behavior across all instances of a view component

### View Bundle (resource/graphical representation point of view)
  - collection of resources providing means for a common graphical representation across all instances of a view component
  - e.g. HTML markup, CSS stylesheet, media resources (e.g. images/audio/video)

### View (general/runtime/instance point of view)
  - concrete instance of a view component
  - self-contained/self-managed piece of UI, most like a widget
  - scoping: managed DOM subtree that has scoped styling and behavior
  - composition: view instances can be in a parent/child relationship meaning that a view may have one or more other views nested inside of itself. This results in a tree structure, the "View Hierarchy"
  - lifecycle: a view has a lifecycle (construction/instantiation, loading, [showing, hiding, doing stuff], unloading, deallocation)
  - memory management

## Dependencies

### jQuery

### RequireJS

