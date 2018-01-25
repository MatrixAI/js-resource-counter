'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var BitSet = _interopDefault(require('bitset.js'));

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
  const createBitMap = function createBitMap() {
    return new BitSet(new Uint8Array(blockSize / 8 - 1)).flip(0, blockSize - 1);
  };

  /**
   * Set a bit
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {BitSet}
   */
  const setBit = function setBit(bitMap, i) {
    return bitMap.set(i, 0);
  };

  /**
   * Unsets a bit
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {BitSet}
   */
  const unsetBit = function unsetBit(bitMap, i) {
    return bitMap.set(i, 1);
  };

  /**
   * Checks if the entire bitmap is set
   * @param {BitSet} bitMap
   * @returns {bool}
   */
  const allSet = function allSet(bitMap) {
    return bitMap.isEmpty();
  };

  /**
   * Checks if the entire bitmap is unset
   * @param {BitSet} bitMap
   * @returns {bool}
   */
  const allUnset = function allUnset(bitMap) {
    return bitMap.cardinality() === blockSize;
  };

  /**
   * Find first set algorithm
   * If null is returned, all items have been set
   * @param {BitSet} bitMap
   * @returns {number|null}
   */
  const firstUnset = function firstUnset(bitMap) {
    let first = bitMap.ntz();
    if (first === Infinity) {
      first = null;
    }
    return first;
  };

  /**
   * Checks if a bit is set.
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {boolean}
   */
  const isSet = function isSet(bitMap, i) {
    return !bitMap.get(i);
  };

  /**
   * Class representing a lazy recursive bitmap tree
   * Only the leaf bitmaps correspond to counters
   * Interior bitmaps index their child bitmaps
   * If an interior bit is set, that means there's no free bits in the child bitmap
   * If an interior bit is not set, that means there's at least 1 free bit in the child bitmap
   */
  class BitMapTree {

    /**
     * Creates a BitMapTree, this is an abstract class
     * It is not meant to by directly instantiated
     * @param {number} begin
     * @param {number} depth
     */
    constructor(begin, depth) {
      this.begin = begin;
      this.depth = depth;
      this.bitMap = createBitMap();
    }

  }

  /**
   * Class representing a Leaf of the recursive bitmap tree
   * This represents the base case of the lazy recursive bitmap tree
   * @extends BitMapTree
   */
  class Leaf extends BitMapTree {

    /**
     * Creates a Leaf
     * @param {number} begin
     */
    constructor(begin) {
      super(begin, 0);
    }

    /**
     * Allocates a counter and sets the corresponding bit for the bitmap
     * @param {?number} counter
     * @param {function} callback
     */
    allocate(counter, callback) {
      let index;
      if (counter === null) {
        index = firstUnset(this.bitMap);
      } else {
        index = counter - this.begin;
      }
      if (index !== null && index >= 0 && index < blockSize) {
        if (!isSet(this.bitMap, index)) {
          setBit(this.bitMap, index);
          callback(this.begin + index, this.bitMap, true);
        } else {
          callback(this.begin + index, this.bitMap, false);
        }
      } else {
        callback(null, null, null);
      }
    }

    /**
     * Deallocates a counter and unsets the corresponding bit for the bitmap
     * @param {number} counter
     * @param {function} callback
     */
    deallocate(counter, callback) {
      const index = counter - this.begin;
      if (index >= 0 && index < blockSize) {
        if (isSet(this.bitMap, index)) {
          unsetBit(this.bitMap, index);
          callback(this.bitMap, true);
        } else {
          callback(this.bitMap, false);
        }
      } else {
        callback(null, null);
      }
    }

  }

  /**
   * Class representing a Node of the recursive bitmap tree
   * @extends BitMapTree
   */
  class Node extends BitMapTree {

    /**
     * Creates a Node
     * @param {number} begin
     * @param {number} depth
     */
    constructor(begin, depth) {
      super(begin, depth);
      this.bitMapTrees = [];
    }

    /**
     * Sets a child node or leaf
     * If the index is left null, then the child is pushed onto the terminal end
     * @param {?number} index
     * @param {Leaf|Node} child
     */
    setChild(index, child) {
      if (index === null) {
        index = this.bitMapTrees.push(child) - 1;
      } else {
        this.bitMapTrees[index] = child;
      }
      if (allSet(child.bitMap)) setBit(this.bitMap, index);
    }

    /**
     * Pops the terminal child node or leaf
     */
    popChild() {
      this.bitMapTrees.pop();
    }

    /**
     * Allocates a counter by allocating the corresponding child
     * Passes a continuation to the child allocate that will
     * set the current bitmap if the child bitmap is now all set
     * It will also lazily create the child if it doesn't already exist
     * @param {?number} counter
     * @param {function} callback
     */
    allocate(counter, callback) {
      let index;
      if (counter === null) {
        index = firstUnset(this.bitMap);
      } else {
        index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
      }
      if (index === null || index < 0 || index >= blockSize) {
        callback(null, null, null);
      } else if (this.bitMapTrees[index]) {
        this.bitMapTrees[index].allocate(counter, (counter, bitMap, changed) => {
          if (bitMap && allSet(bitMap)) {
            setBit(this.bitMap, index);
          }
          callback(counter, this.bitMap, changed);
        });
      } else {
        const newBegin = this.begin + index * Math.pow(blockSize, this.depth);
        const newDepth = this.depth - 1;
        let child;
        if (newDepth === 0) {
          child = new Leaf(newBegin);
        } else {
          child = new Node(newBegin, newDepth);
        }
        this.setChild(index, child);
        child.allocate(counter, (counter, bitMap, changed) => {
          if (bitMap && allSet(bitMap)) {
            setBit(this.bitMap, index);
          }
          callback(counter, this.bitMap, changed);
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
    deallocate(counter, callback) {
      const index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
      if (this.bitMapTrees[index]) {
        const allSetPrior = allSet(this.bitMapTrees[index].bitMap);
        this.bitMapTrees[index].deallocate(counter, (bitMap, changed) => {
          if (bitMap && allSetPrior) {
            unsetBit(this.bitMap, index);
          }
          if (this.bitMapTrees.length - 1 === index && allUnset(bitMap)) {
            this.popChild();
          }
          callback(this.bitMap, changed);
        });
      } else {
        callback(null, null);
      }
    }

  }

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
class Counter {

  /**
   * Creates a counter instance
   * @param {number} [begin] - Defaults to 0
   * @param {number} [blockSize] - Must be a multiple of 32, defaults to 32
   * @throws {TypeError} - Will throw if blockSize is not a multiple of 32
   */
  constructor(begin, blockSize) {
    if (typeof begin === 'undefined') begin = 0;
    if (blockSize && blockSize % 32 !== 0) {
      throw new TypeError('Blocksize for BitMapTree must be a multiple of 32');
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
   * If a counter is specified, it will allocate it explicitly
   * But it will skip over intermediate children, and subsequent allocations is still sequential
   * @param {number} [counter]
   * @returns {number|boolean}
   * @throws {RangeError} - Will throw if the explicitly allocated counter is out of bounds
   */
  allocate(counter) {
    let index = null;
    let changed;
    if (counter !== undefined) {
      if (counter < this._begin) {
        throw new RangeError('Counter needs to be greater or equal to the counter beginning offset');
      }
      index = counter - this._begin;
    }
    this._bitMapTree.allocate(index, (index_, bitMap, changed_) => {
      index = index_;
      changed = changed_;
    });
    if (index !== null) {
      if (counter != null) return changed;
      return index + this._begin;
    } else {
      const newRoot = new this._bitMapConst.Node(this._bitMapTree.begin, this._bitMapTree.depth + 1);
      newRoot.setChild(null, this._bitMapTree);
      this._bitMapTree = newRoot;
      return this.allocate(counter);
    }
  }

  /**
   * Deallocates a number, it makes it available for reuse
   * @param {number} counter
   * @returns {boolean}
   */
  deallocate(counter) {
    let changed;
    this._bitMapTree.deallocate(counter - this._begin, (bitMap, changed_) => {
      changed = changed_;
    });
    return changed;
  }

}

module.exports = Counter;
