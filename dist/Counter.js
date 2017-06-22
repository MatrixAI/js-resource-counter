'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var BitSet = _interopDefault(require('bitset.js'));

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

/** @module Counter */

/**
 * Parameterises the bitmap tree contructors by the block size
 * The block size is the size of each bitmap
 * @param {number} blockSize
 * @returns {{Leaf: Leaf, Node: Node}}
 */
function setupBitMapConstructors(blockSize) {

  // bitset library uses 32 bits numbers internally
  // it preemptively adds an extra number whan it detects it's full
  // this is why we use Uint8Array and minus 1 from the blocksize / 8
  // in order to get exactly the right size
  // because of the functions supplied by the bitset library
  // we invert the notions of set and unset where
  // set is 0 and unset is 1

  /**
   * Creates a new bitmap sized according to the block size
   * @returns {BitSet}
   */
  var createBitMap = function createBitMap() {
    return new BitSet(new Uint8Array(blockSize / 8 - 1)).flip(0, blockSize - 1);
  };

  /**
   * Set a bit
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {BitSet}
   */
  var setBit = function setBit(bitMap, i) {
    return bitMap.set(i, 0);
  };

  /**
   * Unsets a bit
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {BitSet}
   */
  var unsetBit = function unsetBit(bitMap, i) {
    return bitMap.set(i, 1);
  };

  /**
   * Checks if the entire bitmap is set
   * @param {BitSet} bitMap
   * @returns {bool}
   */
  var allSet = function allSet(bitMap) {
    return bitMap.isEmpty();
  };

  /**
   * Checks if the entire bitmap is unset
   * @param {BitSet} bitMap
   * @returns {bool}
   */
  var allUnset = function allUnset(bitMap) {
    return bitMap.cardinality() === blockSize;
  };

  /**
   * Find first set algorithm
   * If null is returned, all items have been set
   * @param {BitSet} bitMap
   * @returns {number|null}
   */
  var firstUnset = function firstUnset(bitMap) {
    var first = bitMap.ntz();
    if (first === Infinity) {
      first = null;
    }
    return first;
  };

  /**
   * Class representing a lazy recursive bitmap tree
   * Only the leaf bitmaps correspond to counters
   * Interior bitmaps index their child bitmaps
   * If an interior bit is set, that means there's no free bits in the child bitmap
   * If an interior bit is not set, that means there's at least 1 free bit in the child bitmap
   */

  var BitMapTree = function () {

    /**
     * Creates a BitMapTree, this is an abstract class
     * It is not meant to by directly instantiated
     * @param {number} begin
     * @param {number} depth
     */
    function BitMapTree(begin, depth) {
      classCallCheck(this, BitMapTree);

      this.begin = begin;
      this.depth = depth;
      this.bitMap = createBitMap();
    }

    /**
     * Sets a bit to allocated
     * @param {number} index
     */


    createClass(BitMapTree, [{
      key: 'set',
      value: function set$$1(index) {
        setBit(this.bitMap, index);
      }

      /**
       * Unsets a bit so that is free
       * @param {number} index
       */

    }, {
      key: 'unset',
      value: function unset(index) {
        unsetBit(this.bitMap, index);
      }
    }]);
    return BitMapTree;
  }();

  

  /**
   * Class representing a Leaf of the recursive bitmap tree
   * This represents the base case of the lazy recursive bitmap tree
   * @extends BitMapTree
   */

  var Leaf = function (_BitMapTree) {
    inherits(Leaf, _BitMapTree);

    /**
     * Creates a Leaf
     * @param {number} begin
     */
    function Leaf(begin) {
      classCallCheck(this, Leaf);
      return possibleConstructorReturn(this, (Leaf.__proto__ || Object.getPrototypeOf(Leaf)).call(this, begin, 0));
    }

    /**
     * Allocates a counter and sets the corresponding bit for the bitmap
     * @param {function} callback
     */


    createClass(Leaf, [{
      key: 'allocate',
      value: function allocate(callback) {
        var index = firstUnset(this.bitMap);
        if (index !== null) {
          setBit(this.bitMap, index);
          callback(this.begin + index, this.bitMap);
        } else {
          callback(null, null);
        }
      }

      /**
       * Deallocates a counter and unsets the corresponding bit for the bitmap
       * @param {number} counter
       * @param {function} callback
       */

    }, {
      key: 'deallocate',
      value: function deallocate(counter, callback) {
        var index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
        if (index >= 0 && index < blockSize) {
          unsetBit(this.bitMap, index);
          callback(this.bitMap);
        } else {
          callback(null);
        }
      }
    }]);
    return Leaf;
  }(BitMapTree);

  

  /**
   * Class representing a Node of the recursive bitmap tree
   * @extends BitMapTree
   */

  var Node = function (_BitMapTree2) {
    inherits(Node, _BitMapTree2);

    /**
     * Creates a Node
     * @param {number} begin
     * @param {number} depth
     */
    function Node(begin, depth) {
      classCallCheck(this, Node);

      var _this2 = possibleConstructorReturn(this, (Node.__proto__ || Object.getPrototypeOf(Node)).call(this, begin, depth));

      _this2.bitMapTrees = [];
      return _this2;
    }

    /**
     * Pushes a child node or leaf to the terminal end
     * @param {Leaf|Node} child
     */


    createClass(Node, [{
      key: 'pushChild',
      value: function pushChild(child) {
        var index = this.bitMapTrees.push(child) - 1;
        if (allSet(child.bitMap)) setBit(this.bitMap, index);
      }

      /**
       * Pops the terminal child node or leaf
       */

    }, {
      key: 'popChild',
      value: function popChild() {
        if (this.bitMapTrees.length) {
          this.bitMapTrees.pop();
        }
      }

      /**
       * Allocates a counter by allocating the corresponding child
       * Passes a continuation to the child allocate that will
       * set the current bitmap if the child bitmap is now all set
       * It will also lazily create the child if it doesn't already exist
       * @param {function} callback
       */

    }, {
      key: 'allocate',
      value: function allocate(callback) {
        var _this3 = this;

        var index = firstUnset(this.bitMap);
        if (index === null) {
          callback(null, null);
        } else if (this.bitMapTrees[index]) {
          this.bitMapTrees[index].allocate(function (counter, bitMap) {
            if (bitMap && allSet(bitMap)) {
              setBit(_this3.bitMap, index);
            }
            callback(counter, _this3.bitMap);
          });
        } else {
          var newBegin = this.begin;
          if (this.bitMapTrees.length) {
            newBegin = this.bitMapTrees[index - 1].begin + Math.pow(blockSize, this.depth);
          }
          var newDepth = this.depth - 1;
          var child = void 0;
          if (newDepth === 0) {
            child = new Leaf(newBegin);
          } else {
            child = new Node(newBegin, newDepth);
          }
          this.pushChild(child);
          child.allocate(function (counter, bitMap) {
            if (bitMap && allSet(bitMap)) {
              setBit(_this3.bitMap, index);
            }
            callback(counter, _this3.bitMap);
          });
        }
      }

      /**
       * Deallocates a counter by deallocating the corresponding child
       * Passes a continuation to the child deallocate that will
       * unset the current bitmap if the child bitmap was previously all set
       * It will also attempt to shrink the tree if the child is the terminal child
       * and it is all unset
       * @param {number} counter
       * @param {function} callback
       */

    }, {
      key: 'deallocate',
      value: function deallocate(counter, callback) {
        var _this4 = this;

        var index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
        if (this.bitMapTrees[index]) {
          var allSetPrior = allSet(this.bitMapTrees[index].bitMap);
          this.bitMapTrees[index].deallocate(counter, function (bitMap) {
            if (bitMap && allSetPrior) {
              unsetBit(_this4.bitMap, index);
            }
            if (_this4.bitMapTrees.length - 1 === index && allUnset(bitMap)) {
              _this4.popChild();
            }
            callback(_this4.bitMap);
          });
        } else {
          callback(null);
        }
      }
    }]);
    return Node;
  }(BitMapTree);

  

  return {
    Leaf: Leaf,
    Node: Node
  };
}

/**
 * Class representing allocatable and deallocatable counters
 * Counters are allocated in sequential manner, this applies to deallocated counters
 * Once a counter is deallocated, it will be reused on the next allocation
 */

var Counter = function () {

  /**
   * Creates a counter instance
   * @param {number} [begin] - Defaults to 0
   * @param {number} [blockSize] - Must be a multiple of 32, defaults to 32
   * @throws {TypeError} - Will throw if blockSize is not a multiple of 32
   */
  function Counter(begin, blockSize) {
    classCallCheck(this, Counter);

    if (typeof begin === 'undefined') begin = 0;
    if (blockSize && blockSize % 32 !== 0) {
      throw TypeError('Blocksize for BitMapTree must be a multiple of 32');
    } else {
      // JavaScript doesn't yet have 64 bit numbers so we default to 32
      blockSize = 32;
    }
    this._begin = begin;
    this._bitMapConst = setupBitMapConstructors(blockSize);
    this._bitMapTree = new this._bitMapConst.Leaf(0);
  }

  /**
   * Allocates a counter sequentially
   * @returns {number}
   */


  createClass(Counter, [{
    key: 'allocate',
    value: function allocate() {
      var resultCounter = void 0;
      this._bitMapTree.allocate(function (counter, bitMap) {
        resultCounter = counter;
      });
      if (resultCounter !== null) {
        return this._begin + resultCounter;
      } else {
        var newRoot = new this._bitMapConst.Node(this._bitMapTree.begin, this._bitMapTree.depth + 1);
        newRoot.pushChild(this._bitMapTree);
        this._bitMapTree = newRoot;
        return this.allocate();
      }
    }

    /**
     * Deallocates a number, it makes it available for reuse
     * @param {number} counter
     */

  }, {
    key: 'deallocate',
    value: function deallocate(counter) {
      this._bitMapTree.deallocate(counter - this._begin, function () {});
    }
  }]);
  return Counter;
}();

module.exports = Counter;
