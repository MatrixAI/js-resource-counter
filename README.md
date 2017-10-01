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
console.log(c.allocate() === (fourth + 1));
// you can also explicitly set a specific number
// and all subsequent allocations are still sequential
c.allocate(100);
```

Documentation
--------------

Documentation is located in the `doc` folder. You can also view the [rendered HTML](https://cdn.rawgit.com/MatrixAI/js-resource-counter/ce46e973/doc/index.html).

Performance behaviour is lazy memory allocation on counter allocation (for both balanced tree growth and explicit counter allocation). This laziness means intermediate tree nodes won't be allocated when explicitly allocating a counter that has intermediate values. For example allocating only 0 and 500, tree nodes won't be created eagerly in anticipation for counter values 1 to 499.

Memory deallocation only occurs when the highest counter is deallocated and the entire counter block for the leaf that it occupies are all also deallocated. So memory deallocation won't occur for deallocating intermediate counter values. Also the

It's possible to make the tree also eagerly deallocate memory even for intermediate counter deallocations, but this is inefficient, since you will probably have to use those counter values again later anyway. It may reduce dynamic memory usage, but at the cost of repeatedly allocating and deallocating memory for the same counter value.

Development
------------

To build this package for release:

```
npm run build
```

It will run tests, generate documentation and output multiple targets. One for browsers and one for nodejs. See `rollup.config.js` to see the target specification.

If your bundler is aware of the module field in `package.json`, you'll get the ES6 module directly.

Once you've updated the package run this:

```
npm version <update_type>
npm publish
```
