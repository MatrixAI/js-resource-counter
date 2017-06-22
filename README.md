# js-resource-counter

Sequentially Allocatable and Deallocatable Resource Counter written in JavaScript

To build this package for release:

```
npm run build
```

It will run tests, generate documentation and output multiple targets. One for browsers and one for nodejs. See `rollup.config.js` to see the target specification.

If you're bundler is aware of the module field in `package.json`, you'll get the ES6 directly.
