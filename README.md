# js-resource-counter

Sequentially Allocatable and Deallocatable Resource Counter written in JavaScript. It is useful for tracking resource usage such as inodes and file descriptors. The resource counter is backed by a new lazy recursive perfectly balanced dynamically growing and shrinking bitmap tree data structure. This allows logarithmic allocation and deallocation performance. It's memory usage is better than the alternative deallocated stack + counter method.

Basic Usage
------------

```sh
npm install --save 'resource-counter';
```

```js
import Counter from 'resource-counter';
let c = new Counter;
let first = c.allocate();
let second = c.allocate();
let third = c.allocate();
let fourth = c.allocate();
c.deallocate(second);
c.deallocate(third);
console.log(c.allocate() === second);
console.log(c.allocate() === third);
```

Documentation
--------------

Documentation is located in the `doc` folder. You can also view the [rendered HTML](https://cdn.rawgit.com/MatrixAI/js-resource-counter/ce46e973/doc/index.html).

Development
------------

To build this package for release:

```
npm run build
```

It will run tests, generate documentation and output multiple targets. One for browsers and one for nodejs. See `rollup.config.js` to see the target specification.

If your bundler is aware of the module field in `package.json`, you'll get the ES6 module directly.
