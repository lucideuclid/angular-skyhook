## Contents

1. [Installation](#installation)
2. [Motivation and design](#motivation-and-design)
2. [Translating `react-dnd` code](#translating-react-dnd-code)
3. [Troubleshooting](#troubleshooting)



## Installation

[Contents](#contents)

```sh
npm install __PackageName__
npm install react-dnd-html5-backend
```

Or `yarn add`, if you wish. Then import [[DndModule]] and provide the backend:

```typescript
import { __ModuleName__ } from '__PackageName__';
import { default as HTML5Backend } from 'react-dnd-html5-backend'

@NgModule({
  imports: [
    // Don't forget the forRoot()
    __ModuleName__.forRoot(),
  ],
  providers: [
    // this makes the HTML5 backend available
    __ModuleName__.provideBackend(HTML5Backend),
  ]
})
export class AppModule {}
```

If you need it on a child module, like a lazy-loaded router module, only import
[[DndModule]] there. This will ensure the backend and global drag state (the
`DragDropManager` in `dnd-core`) is only initialized once.

If you want dragging to work on mobile devices, try installing the [Touch
Backend][1], or, when it becomes compatible, the auto-switching [Multi
Backend][2].

When installing backends, __make sure you use the `import { default as XXX } from
'...'`__ syntax, because Angular in AOT mode cannot do `import XXX from '...'`
directly.

[1]: https://github.com/yahoo/react-dnd-touch-backend
[2]: https://github.com/LouisBrunner/react-dnd-multi-backend



## Motivation and design

Most drag and drop libraries try to solve two things:

1.  Modifying live [DOM][3] to resemble dragging and dropping is hard; even just
    keeping track of what's in-flight is a tough job.
2.  A small set of common-looking use cases like Sortable.

The inevitable result is compromise. Aiming for the common use cases means
providing one-size-fits-all modules that hide all the possibilities out of
reach. For example, because most involve actually lifting a DOM element, the
default behaviour is to 'move' that object around and put it somewhere else.
A library might provide a 'copy' option just in case you don't want that, but
the choices often end there.

`react-dnd` and `__PackageName__` both hand off #1 to a pair of other libraries,
[`dnd-core`][dnd-core] and a backend, and worry no futher about that.

[3]: https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction

Your own visual drag/drop metaphor could be anything from a stock-standard
drag-here-drop-there affair, to an intricate puzzle with objects that continue
to interact while in-flight.

### This is all you need to define all of those use cases

1.  An **item** (JS Object, not a DOM node) as the source of truth for each drag
    operation
2.  A **drag source**, which registers a DOM node to commence drag operations
3.  A **drop target**, which registers a DOM node for hover and drop events
    while dragging
4.  A way for each to provide, listen for and query changes in the drag state:
    a **monitor** and appropriate callbacks
5.  Hooks to provide some other DOM element as the drag preview.

`react-dnd` defined one more thing, inspired by HTML5, to make using this sane:
each **item** has a **type**, and drag sources and drop targets will
respectively emit and accept only items with matching types.

That's it! This library offers all those concepts in an Angular-friendly way,
that is also largely compatible with a lot of `react-dnd` code and examples.

It is important to note that for bare-bones sortable lists, where you have
a mutable array of simple values, you don't necessarily need the superpowers in
this library. There are plenty of cookie-cutter solutions out there, like the
quite-powerful [`ng2-dnd`][ng2-dnd] or [`ng2-dragula`][ng2-dragula], which may
get you to your deadline faster than learning and using `__PackageName__`. But
be warned; you may find yourself wanting more dragging power once you get
a taste. In fact, this package was born out of maintaining `ng2-dragula` and
watching users struggle to implement what `react-dnd` was born for.

[ng2-dnd]: https://github.com/akserg/ng2-dnd
[ng2-dragula]: https://github.com/valor-software/ng2-dragula



## Translating `react-dnd` code

[Contents](#contents)

There are many code examples and libraries on the web written for `react-dnd`,
the most important of which is the actual [`react-dnd`
documentation](http://react-dnd.github.io/react-dnd/docs-overview.html). In the
interest of making them useful or at least understandable, this library presents
a fairly similar API to the original. There are, of course, some differences
mandated by the style and limitations of React and Angular. We will illustrate
this with the `react-dnd` `DragSource` compared to `__PackageName__`
`DndService.dragSource()`. Here are the [original API
docs](http://react-dnd.github.io/react-dnd/docs-drag-source.html) on
`DragSource`; the following is a small but complete example for a quick
reference. If you know how to use `react-dnd` already, then this should show you
most of it. If you don't know `react-dnd`, this will help you read [the example
code demos][react-examples] in the `react-dnd` documentation.

[react-examples]: http://react-dnd.github.io/react-dnd/examples-chessboard-tutorial-app.html

Here's a basic example in React:

```javascript
let itemSourceSpec = {
  beginDrag: (props, monitor) => {
    return { someProperty: props.someProperty };
  },
  endDrag: (props, monitor, component) => {
    if (monitor.didDrop()) {
      component.fireAction(monitor.getItem());
    }
  }
}
@DragSource("ITEM", itemSourceSpec, (connect, monitor) => ({
  connectDragSource: connect.connectDragSource(),
  isDragging: monitor.isDragging(),
}))
export class MyComponent {
  fireAction() { /* ... */ }
  render() {
    const { someProperty, isDragging } = this.props;
    return connectDragSource(
      <div>
        {someProperty}
        {isDragging ? 'I am being dragged now' : null}
      </div>
    );
  }
}
```

And here's the Angular translation:

```typescript
@Component({
  template: `
```

```html
  <div [dragSource]="itemSource">
    {{someProperty}}
    <span *ngIf="(collected$|async).isDragging">
      I am being dragged now
    </span>
  </div>
  `
```

```typescript
})
export class MyComponent {
  @Input() someProperty: string;
  itemSource = dnd.dragSource("ITEM", {
    beginDrag: (monitor) => {
      return { someProperty: this.someProperty };
    },
    endDrag: (monitor) => {
      if (monitor.didDrop()) {
        this.fireAction(monitor.getItem());
      }
    }
  });
  collected$ = itemSource.listen(monitor => ({
    isDragging: monitor.isDragging(),
  }));
  constructor(private dnd: DndService) {}
  fireAction(item) { /* ... */ }
  ngOnDestroy() { this.itemSource.destroy(); }
}
```

As you can see, the two are very similar. You should be able to take most
React/`react-dnd` examples and translate them quite directly into Angular. You
can _almost_ copy and paste some parts.

### 1. Biggest difference: Connections instead of Higher-Order Components

There is a React concept of 'props', similar to `Input()` in Angular. The
primary difference relevant to us is that in React you can create a 'wrapper' or
'higher-order' component that will pass all of its props to the one it is
'wrapping' or 'decorating', with extra behaviour or new props added. This is how
`react-dnd` works: wrap your component with `@DragSource(type, spec, collect:
(connect, monitor) => Object)`, and the output of the  `collect` function is
injected into your component's props.

_In Angular, we run everything inside your component_, using methods on an
injected `DndService` to create **connections**. Connections are a go-between
for subscribing to the global drag state and can be connected to DOM
elements. This difference is typical of the React Way and the Angular Way. You
can create more than one connection for a component, to accomplish the same
thing as composing multiple decorators in `react-dnd`.

There are five other ways this approach makes for slightly different-looking but
very similar-functioning code.

### 2. You must destroy the connection object when you are done with it.

In React, this is managed by the wrapper component. In Angular, you have to do
it yourself. See [[ConnectionBase.unsubscribe]].


### 3. No `props` or `component` arguments in the `spec` callbacks

There are no props in Angular, as discussed above. Instead, all inputs to a component
or properties relevant to the template are declared on the component class.
Therefore, using `this` is appropriate instead. That also makes `component`
moot, since it would also refer to `this`. Therefore, all of the callbacks on the
two `*Spec` interfaces have only `monitor` as an argument.

One thing to be aware of is that to access `this` in an function you pass
elsewhere, you **must use Arrow notation: `(arrow) => this.notation;`** for your
spec callbacks.


### 4. Information about current drag state comes through an Observable

In `react-dnd` the `collect((props, monitor) => {})` function supplies the
component props 'from above'. In Angular (here, [[DragSource.listen]]), the
library gives you an Observable you can subscribe to in your template. The
example above creates an Object `{ ... }` and subscribes to it all in one go
(the internals make this efficient), but you are free to do `listen(m =>
m.isDragging())`, with one subscription for each interesting value. You might
combine information from two different connections using
`Observable.combineLatest`, for example.

I found the terms `connect` and `collect` far too similar and confusing, so
I renamed `collect` to `listen`.

### 5. `connectDragSource()` (etc.) functions vs Angular directives

In the example above, `connect.connectDragSource()` returns a function that will
link up a particular part of the JSX template's DOM to the wrapper component. To
accomplish the same thing in Angular we must connect some DOM from the template
to a Connection object. The Angular Way to do this is with a __directive__,
which connects to the DOM via its injected `ElementRef`. The Angular translation
above uses `[dragSource]="itemSource"` on the same part of the template as the
React code does.

Some React examples will have two different drag sources + associated connectors
(on different DOM elements), or one source and one `connectDragPreview`. Angular
can do both patterns with directives, because each directive is linked to one Connection.

### 6. Can't supply a dynamic type via a `(props) => props.type` callback, use `setType` instead

Imagine you want to make a component draggable based on type(s) specified on the
component inputs.

`react-dnd` allows strings and ES6 Symbols in the type argument. But you can
_also_ pass a function  of `(props) => string|symbol`; in this way, your item
types can depend on the inputs to your component, and even change over time when
the props change. It's not a plain asynchronous callback like the rest of the
spec, it is called when the props change on the decorating component, before any
asynchronous drag operations start. Angular doesn't have a way for arbitrary
objects to listen to `ngOnChanges()`, so we have to do it manually.

You can supply a default type, or `null`, and update it in later as the
`@Input()` property is populated. If you supply `null`, `__PackageName__` will
defer connecting the DOM and the subscription to the `monitor` until this is
done. See [[DragSource.setType]] for more information.


## Troubleshooting

[Contents](#contents)

### (1) I get `TypeError: backend is null`, only when AOT is enabled

Also rears its head as `No such property 'default' of undefined`.

**Troubleshooting steps**

1.  Check you are importing the backend and renaming any default exports.

    ```
    import { default as HTML5Backend } from 'react-dnd-html5-backend';
    import { SomeImaginaryBackend } from 'some-imaginary-backend';
    ```

    Generally, make sure you are importing the backend correctly. If it does not
    provide Typescript definitions, you might have to read the documentation or
    browse the source code.

2.  Make sure in your root Angular module (usually `app.module.ts`) you import
    `DndModule.forRoot(Backend)` instead of plain `DndModule`.

### (2) In the spec callbacks, my component doesn't have any properties, and it can't call `this.method()`!

**Solution**: Make sure you use the arrow function syntax (`() =>`) in your specs so `this` will refer to your component. Example:

```typescript
paperCount = 3;
limitedSupplyOfPaper = this.dnd.dragSource("PAPER", {
    // use shorthand for one-liners that return a value
    canDrag: () => this.paperCount > 0,
    endDrag: (monitor) => {
        if (monitor.didDrop()) {
            this.paperCount--;
        }
    }
});
```

[This demo](https://goo.gl/VYQMEs) shows comprehensively what `this` refers to
in arrow functions vs regular ones. A sufficiently advanced editor shouldn't
show any completions at `this.|` in a regular function, as it will resolve the
type of `this` to be `any`.


