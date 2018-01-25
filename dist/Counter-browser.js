(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Counter = factory());
}(this, (function () { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var bitset = createCommonjsModule(function (module, exports) {
/**
 * @license BitSet.js v4.0.1 14/08/2015
 * http://www.xarg.org/2014/03/javascript-bit-array/
 *
 * Copyright (c) 2016, Robert Eisele (robert@xarg.org)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 **/
(function(root) {

  'use strict';

  /**
   * The number of bits of a word
   * @const
   * @type number
   */
  var WORD_LENGTH = 32;

  /**
   * The log base 2 of WORD_LENGTH
   * @const
   * @type number
   */
  var WORD_LOG = 5;

  /**
   * Calculates the number of set bits
   * 
   * @param {number} v
   * @returns {number}
   */
  function popCount(v) {

    // Warren, H. (2009). Hacker`s Delight. New York, NY: Addison-Wesley

    v -= ((v >>> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
    return (((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24);
  }

  /**
   * Divide a number in base two by B
   *
   * @param {Array} arr
   * @param {number} B
   * @returns {number}
   */
  function divide(arr, B) {

    var r = 0;
    var d;
    var i = 0;

    for (; i < arr.length; i++) {
      r *= 2;
      d = (arr[i] + r) / B | 0;
      r = (arr[i] + r) % B;
      arr[i] = d;
    }
    return r;
  }

  /**
   * Parses the parameters and set variable P
   *
   * @param {Object} P
   * @param {string|BitSet|Array|Uint8Array|number=} val
   */
  function parse(P, val) {

    if (val == null) {
      P['data'] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      P['_'] = 0;
      return;
    }

    if (val instanceof BitSet) {
      P['data'] = val['data'];
      P['_'] = val['_'];
      return;
    }

    switch (typeof val) {

      case 'number':
        P['data'] = [val | 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        P['_'] = 0;
        break;

      case 'string':

        var base = 2;
        var len = WORD_LENGTH;

        if (val.indexOf('0b') === 0) {
          val = val.substr(2);
        } else if (val.indexOf('0x') === 0) {
          val = val.substr(2);
          base = 16;
          len = 8;
        }

        P['data'] = [];
        P['_'] = 0;

        var a = val.length - len;
        var b = val.length;

        do {

          var num = parseInt(val.slice(a > 0 ? a : 0, b), base);

          if (isNaN(num)) {
            throw SyntaxError('Invalid param');
          }

          P['data'].push(num |  0);

          if (a <= 0)
            break;

          a -= len;
          b -= len;
        } while (1);

        break;

      default:
        
        P['data'] = [0];
        var data = P['data'];

        if (val instanceof Array) {

          for (var i = val.length - 1; i >= 0; i--) {
            
            var ndx = val[i];

            if (ndx === Infinity) {
              P['_'] = -1;
            } else {
              scale(P, ndx);
              data[ndx >>> WORD_LOG] |= 1 << ndx;
            }
          }
          break;
        }

        if (Uint8Array && val instanceof Uint8Array) {

          var bits = 8;

          scale(P, val.length * bits);

          for (var i = 0; i < val.length; i++) {

            var n = val[i];

            for (var j = 0; j < bits; j++) {

              var k = i * bits + j;

              data[k >>> WORD_LOG] |= (n >> j & 1) << k;
            }
          }
          break;
        }
        throw SyntaxError('Invalid param');
    }
  }

  /**
   * Module entry point
   *
   * @constructor
   * @param {string|BitSet|number=} param
   * @returns {BitSet}
   */
  function BitSet(param) {

    if (!(this instanceof BitSet)) {
      return new BitSet(param);
    }
    parse(this, param);
    this['data'] = this['data'].slice();
  }

  function scale(dst, ndx) {

    var l = ndx >>> WORD_LOG;
    var d = dst['data'];
    var v = dst['_'];

    for (var i = d.length; l >= i; l--) {
      d[l] = v;
    }
  }

  var P = {
    'data': [],
    '_': 0
  };

  BitSet.prototype = {
    'data': [],
    '_': 0,
    /**
     * Set a single bit flag
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * bs1.set(3, 1);
     *
     * @param {number} ndx The index of the bit to be set
     * @param {number=} value Optional value that should be set on the index (0 or 1)
     * @returns {BitSet} this
     */
    'set': function(ndx, value) {

      ndx |= 0;

      scale(this, ndx);

      if (value === undefined || value) {
        this['data'][ndx >>> WORD_LOG] |= (1 << ndx);
      } else {
        this['data'][ndx >>> WORD_LOG] &= ~(1 << ndx);
      }
      return this;
    },
    /**
     * Get a single bit flag of a certain bit position
     *
     * Ex:
     * bs1 = new BitSet();
     * var isValid = bs1.get(12);
     *
     * @param {number} ndx the index to be fetched
     * @returns {number|null} The binary flag
     */
    'get': function(ndx) {

      ndx |= 0;

      var d = this['data'];
      var n = ndx >>> WORD_LOG;

      if (n > d.length) {
        return this['_'] & 1;
      }
      return (d[n] >>> ndx) & 1;
    },
    /**
     * Creates the bitwise AND of two sets. The result is stored in-place.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.and(bs2);
     *
     * @param {BitSet} value A bitset object
     * @returns {BitSet} this
     */
    'and': function(value) {// intersection

      parse(P, value);

      var t = this['data'];
      var p = P['data'];

      var p_ = P['_'];

      var pl = p.length - 1;
      var tl = t.length - 1;

      if (p_ == 0) {
        // clear any bits set:
        for (var i = tl; i > pl; i--) {
          t[i] = 0;
        }
      }

      for (; i >= 0; i--) {
        t[i] &= p[i];
      }

      this['_'] &= P['_'];

      return this;
    },
    /**
     * Creates the bitwise OR of two sets. The result is stored in-place.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.or(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} this
     */
    'or': function(val) { // union

      parse(P, val);

      var t = this['data'];
      var p = P['data'];

      var pl = p.length - 1;
      var tl = t.length - 1;

      var minLength = Math.min(tl, pl);

      // Append backwards, extend array only once
      for (var i = pl; i > minLength; i--) {
        t[i] = p[i];
      }

      for (; i >= 0; i--) {
        t[i] |= p[i];
      }

      this['_'] |= P['_'];

      return this;
    },
    /**
     * Creates the bitwise NOT of a set. The result is stored in-place.
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * bs1.not();
     *
     * @returns {BitSet} this
     */
    'not': function() { // invert()

      var d = this['data'];
      for (var i = 0; i < d.length; i++) {
        d[i] = ~d[i];
      }

      this['_'] = ~this['_'];

      return this;
    },
    /**
     * Creates the bitwise XOR of two sets. The result is stored in-place.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.xor(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} this
     */
    'xor': function(val) { // symmetric difference

      parse(P, val);

      var t = this['data'];
      var p = P['data'];

      var t_ = this['_'];
      var p_ = P['_'];

      var i = 0;

      var tl = t.length - 1;
      var pl = p.length - 1;

      // Cut if tl > pl
      for (i = tl; i > pl; i--) {
        t[i] ^= p_;
      }

      // Cut if pl > tl
      for (i = pl; i > tl; i--) {
        t[i] = t_ ^ p[i];
      }

      // XOR the rest
      for (; i >= 0; i--) {
        t[i] ^= p[i];
      }

      // XOR infinity
      this['_'] ^= p_;

      return this;
    },
    /**
     * Flip/Invert a range of bits by setting
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.flip(); // Flip entire set
     * bs1.flip(5); // Flip single bit
     * bs1.flip(3,10); // Flip a bit range
     *
     * @param {number=} from The start index of the range to be flipped
     * @param {number=} to The end index of the range to be flipped
     * @returns {BitSet} this
     */
    'flip': function(from, to) {

      if (from === undefined) {

        return this['not']();

      } else if (to === undefined) {

        from |= 0;

        scale(this, from);

        this['data'][from >>> WORD_LOG] ^= (1 << from);

      } else if (from <= to && 0 <= from) {

        scale(this, to);

        for (var i = from; i <= to; i++) {
          this['data'][i >>> WORD_LOG] ^= (1 << i);
        }
      }
      return this;
    },
    /**
     * Creates the bitwise AND NOT (not confuse with NAND!) of two sets. The result is stored in-place.
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.notAnd(bs2);
     *
     * @param {BitSet} val A bitset object
     * @returns {BitSet} this
     */
    'andNot': function(val) { // difference

      parse(P, val);

      var t = this['data'];
      var p = P['data'];

      var t_ = this['_'];
      var p_ = P['_'];

      var l = Math.min(t.length, p.length);

      for (var k = 0; k < l; k++) {
        t[k] &= ~p[k];
      }
      this['_'] &= ~p_;

      return this;
    },
    /**
     * Clear a range of bits by setting it to 0
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.clear(); // Clear entire set
     * bs1.clear(5); // Clear single bit
     * bs1.clar(3,10); // Clear a bit range
     *
     * @param {number=} from The start index of the range to be cleared
     * @param {number=} to The end index of the range to be cleared
     * @returns {BitSet} this
     */
    'clear': function(from, to) {

      var data = this['data'];

      if (from === undefined) {

        for (var i = data.length - 1; i >= 0; i--) {
          data[i] = 0;
        }
        this['_'] = 0;

      } else if (to === undefined) {

        from |= 0;

        scale(this, from);

        data[from >>> WORD_LOG] &= ~(1 << from);

      } else if (from <= to) {

        scale(this, to);

        for (var i = from; i <= to; i++) {
          data[i >>> WORD_LOG] &= ~(1 << i);
        }
      }
      return this;
    },
    /**
     * Gets an entire range as a new bitset object
     *
     * Ex:
     * bs1 = new BitSet();
     * bs1.slice(4, 8);
     *
     * @param {number=} from The start index of the range to be get
     * @param {number=} to The end index of the range to be get
     * @returns {BitSet|Object} A new smaller bitset object, containing the extracted range
     */
    'slice': function(from, to) {

      if (from === undefined) {
        return this['clone']();
      } else if (to === undefined) {

        to = this['data'].length * WORD_LENGTH;

        var im = Object.create(BitSet.prototype);

        im['_'] = this['_'];
        im['data'] = [0];

        for (var i = from; i <= to; i++) {
          im['set'](i - from, this['get'](i));
        }
        return im;

      } else if (from <= to && 0 <= from) {

        var im = Object.create(BitSet.prototype);
        im['data'] = [0];

        for (var i = from; i <= to; i++) {
          im['set'](i - from, this['get'](i));
        }
        return im;
      }
      return null;
    },
    /**
     * Set a range of bits
     *
     * Ex:
     * bs1 = new BitSet();
     *
     * bs1.setRange(10, 15, 1);
     *
     * @param {number} from The start index of the range to be set
     * @param {number} to The end index of the range to be set
     * @param {number} value Optional value that should be set on the index (0 or 1)
     * @returns {BitSet} this
     */
    'setRange': function(from, to, value) {

      for (var i = from; i <= to; i++) {
        this['set'](i, value);
      }
      return this;
    },
    /**
     * Clones the actual object
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = bs1.clone();
     *
     * @returns {BitSet|Object} A new BitSet object, containing a copy of the actual object
     */
    'clone': function() {

      var im = Object.create(BitSet.prototype);
      im['data'] = this['data'].slice();
      im['_'] = this['_'];

      return im;
    },
    /**
     * Gets a list of set bits
     * 
     * @returns {Array|number}
     */
    'toArray': Math['clz32'] ?
            function() {

              var ret = [];
              var data = this['data'];

              for (var i = data.length - 1; i >= 0; i--) {

                var num = data[i];

                while (num !== 0) {
                  var t = 31 - Math['clz32'](num);
                  num ^= 1 << t;
                  ret.unshift((i * WORD_LENGTH) + t);
                }
              }

              if (this['_'] !== 0)
                ret.push(Infinity);

              return ret;
            } :
            function() {

              var ret = [];
              var data = this['data'];

              for (var i = 0; i < data.length; i++) {

                var num = data[i];

                while (num !== 0) {
                  var t = num & -num;
                  num ^= t;
                  ret.push((i * WORD_LENGTH) + popCount(t - 1));
                }
              }

              if (this['_'] !== 0)
                ret.push(Infinity);

              return ret;
            },
    /**
     * Overrides the toString method to get a binary representation of the BitSet
     *
     * @param {number=} base
     * @returns string A binary string
     */
    'toString': function(base) {

      var data = this['data'];

      if (!base)
        base = 2;

      // If base is power of two
      if ((base & (base - 1)) === 0 && base < 36) {

        var ret = '';
        var len = 2 + Math.log(4294967295/*Math.pow(2, WORD_LENGTH)-1*/) / Math.log(base) | 0;

        for (var i = data.length - 1; i >= 0; i--) {

          var cur = data[i];

          // Make the number unsigned
          if (cur < 0)
            cur += 4294967296 /*Math.pow(2, WORD_LENGTH)*/;

          var tmp = cur.toString(base);

          if (ret !== '') {
            // Fill small positive numbers with leading zeros. The +1 for array creation is added outside already
            ret += new Array(len - tmp.length).join('0');
          }
          ret += tmp;
        }

        if (this['_'] === 0) {

          ret = ret.replace(/^0+/, '');

          if (ret === '')
            ret = '0';
          return ret;

        } else {
          // Pad the string with ones
          ret = '1111' + ret;
          return ret.replace(/^1+/, '...1111');
        }

      } else {

        if ((2 > base || base > 36))
          throw 'Invalid base';

        var ret = [];
        var arr = [];

        // Copy every single bit to a new array
        for (var i = data.length; i--; ) {

          for (var j = WORD_LENGTH; j--; ) {

            arr.push(data[i] >>> j & 1);
          }
        }

        do {
          ret.unshift(divide(arr, base).toString(base));
        } while (!arr.every(function(x) {
          return x === 0;
        }));

        return ret.join('');
      }
    },
    /**
     * Check if the BitSet is empty, means all bits are unset
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * bs1.isEmpty() ? 'yes' : 'no'
     *
     * @returns {boolean} Whether the bitset is empty
     */
    'isEmpty': function() {

      if (this['_'] !== 0)
        return false;

      var d = this['data'];

      for (var i = d.length - 1; i >= 0; i--) {
        if (d[i] !== 0)
          return false;
      }
      return true;
    },
    /**
     * Calculates the number of bits set
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var num = bs1.cardinality();
     *
     * @returns {number} The number of bits set
     */
    'cardinality': function() {

      if (this['_'] !== 0) {
        return Infinity;
      }

      var s = 0;
      var d = this['data'];
      for (var i = 0; i < d.length; i++) {
        var n = d[i];
        if (n !== 0)
          s += popCount(n);
      }
      return s;
    },
    /**
     * Calculates the Most Significant Bit / log base two
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var logbase2 = bs1.msb();
     *
     * var truncatedTwo = Math.pow(2, logbase2); // May overflow!
     *
     * @returns {number} The index of the highest bit set
     */
    'msb': Math['clz32'] ?
            function() {

              if (this['_'] !== 0) {
                return Infinity;
              }

              var data = this['data'];

              for (var i = data.length; i-- > 0; ) {

                var c = Math['clz32'](data[i]);

                if (c !== WORD_LENGTH) {
                  return (i * WORD_LENGTH) + WORD_LENGTH - 1 - c;
                }
              }
              return Infinity;
            } :
            function() {

              if (this['_'] !== 0) {
                return Infinity;
              }

              var data = this['data'];

              for (var i = data.length; i-- > 0; ) {

                var v = data[i];
                var c = 0;

                if (v) {

                  for (; (v >>>= 1) > 0; c++) {
                  }
                  return (i * WORD_LENGTH) + c;
                }
              }
              return Infinity;
            },
    /**
     * Calculates the number of trailing zeros
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var ntz = bs1.ntz();
     *
     * @returns {number} The index of the lowest bit set
     */
    'ntz': function() {

      var data = this['data'];

      for (var j = 0; j < data.length; j++) {
        var v = data[j];

        if (v !== 0) {

          v = (v ^ (v - 1)) >>> 1; // Set v's trailing 0s to 1s and zero rest

          return (j * WORD_LENGTH) + popCount(v);
        }
      }
      return Infinity;
    },
    /**
     * Calculates the Least Significant Bit
     *
     * Ex:
     * bs1 = new BitSet(10);
     *
     * var lsb = bs1.lsb();
     *
     * @returns {number} The index of the lowest bit set
     */
    'lsb': function() {

      var data = this['data'];

      for (var i = 0; i < data.length; i++) {

        var v = data[i];
        var c = 0;

        if (v) {

          var bit = (v & -v);

          for (; (bit >>>= 1); c++) {

          }
          return WORD_LENGTH * i + c;
        }
      }
      return this['_'] & 1;
    },
    /**
     * Compares two BitSet objects
     *
     * Ex:
     * bs1 = new BitSet(10);
     * bs2 = new BitSet(10);
     *
     * bs1.equals(bs2) ? 'yes' : 'no'
     *
     * @param {BitSet} val A bitset object
     * @returns {boolean} Whether the two BitSets are similar
     */
    'equals': function(val) {

      parse(P, val);

      var t = this['data'];
      var p = P['data'];

      var t_ = this['_'];
      var p_ = P['_'];

      var tl = t.length - 1;
      var pl = p.length - 1;

      if (p_ !== t_) {
        return false;
      }

      var minLength = tl < pl ? tl : pl;

      for (var i = 0; i <= minLength; i++) {
        if (t[i] !== p[i])
          return false;
      }

      for (i = tl; i > pl; i--) {
        if (t[i] !== p_)
          return false;
      }

      for (i = pl; i > tl; i--) {
        if (p[i] !== t_)
          return false;
      }
      return true;
    }
  };

  BitSet.fromBinaryString = function(str) {

    return new BitSet('0b' + str);
  };

  BitSet.fromHexString = function(str) {

    return new BitSet('0x' + str);
  };

  if (typeof undefined === 'function' && undefined['amd']) {
    undefined([], function() {
      return BitSet;
    });
  } else {
    module['exports'] = BitSet;
  }

})(commonjsGlobal);
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
    return new bitset(new Uint8Array(blockSize / 8 - 1)).flip(0, blockSize - 1);
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
   * Checks if a bit is set.
   * @param {BitSet} bitMap
   * @param {number} i
   * @returns {boolean}
   */
  var isSet = function isSet(bitMap, i) {
    return !bitMap.get(i);
  };

  /**
   * Class representing a lazy recursive bitmap tree
   * Only the leaf bitmaps correspond to counters
   * Interior bitmaps index their child bitmaps
   * If an interior bit is set, that means there's no free bits in the child bitmap
   * If an interior bit is not set, that means there's at least 1 free bit in the child bitmap
   */

  var BitMapTree =

  /**
   * Creates a BitMapTree, this is an abstract class
   * It is not meant to by directly instantiated
   * @param {number} begin
   * @param {number} depth
   */
  function BitMapTree(begin, depth) {
    _classCallCheck(this, BitMapTree);

    this.begin = begin;
    this.depth = depth;
    this.bitMap = createBitMap();
  };

  

  /**
   * Class representing a Leaf of the recursive bitmap tree
   * This represents the base case of the lazy recursive bitmap tree
   * @extends BitMapTree
   */

  var Leaf = function (_BitMapTree) {
    _inherits(Leaf, _BitMapTree);

    /**
     * Creates a Leaf
     * @param {number} begin
     */
    function Leaf(begin) {
      _classCallCheck(this, Leaf);

      return _possibleConstructorReturn(this, (Leaf.__proto__ || Object.getPrototypeOf(Leaf)).call(this, begin, 0));
    }

    /**
     * Allocates a counter and sets the corresponding bit for the bitmap
     * @param {?number} counter
     * @param {function} callback
     */


    _createClass(Leaf, [{
      key: 'allocate',
      value: function allocate(counter, callback) {
        var index = void 0;
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

    }, {
      key: 'deallocate',
      value: function deallocate(counter, callback) {
        var index = counter - this.begin;
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

      /**
       * Checks if the counter has been set
       * @param {number} counter
       * @param {function} callback
       */

    }, {
      key: 'check',
      value: function check(counter, callback) {
        var index = counter - this.begin;
        if (index >= 0 && index < blockSize) {
          if (isSet(this.bitMap, index)) {
            callback(true);
          } else {
            callback(false);
          }
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
    _inherits(Node, _BitMapTree2);

    /**
     * Creates a Node
     * @param {number} begin
     * @param {number} depth
     */
    function Node(begin, depth) {
      _classCallCheck(this, Node);

      var _this2 = _possibleConstructorReturn(this, (Node.__proto__ || Object.getPrototypeOf(Node)).call(this, begin, depth));

      _this2.bitMapTrees = [];
      return _this2;
    }

    /**
     * Sets a child node or leaf
     * If the index is left null, then the child is pushed onto the terminal end
     * @param {?number} index
     * @param {Leaf|Node} child
     */


    _createClass(Node, [{
      key: 'setChild',
      value: function setChild(index, child) {
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

    }, {
      key: 'popChild',
      value: function popChild() {
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

    }, {
      key: 'allocate',
      value: function allocate(counter, callback) {
        var _this3 = this;

        var index = void 0;
        if (counter === null) {
          index = firstUnset(this.bitMap);
        } else {
          index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
        }
        if (index === null || index < 0 || index >= blockSize) {
          callback(null, null, null);
        } else if (this.bitMapTrees[index]) {
          this.bitMapTrees[index].allocate(counter, function (counter, bitMap, changed) {
            if (bitMap && allSet(bitMap)) {
              setBit(_this3.bitMap, index);
            }
            callback(counter, _this3.bitMap, changed);
          });
        } else {
          var newBegin = this.begin + index * Math.pow(blockSize, this.depth);
          var newDepth = this.depth - 1;
          var child = void 0;
          if (newDepth === 0) {
            child = new Leaf(newBegin);
          } else {
            child = new Node(newBegin, newDepth);
          }
          this.setChild(index, child);
          child.allocate(counter, function (counter, bitMap, changed) {
            if (bitMap && allSet(bitMap)) {
              setBit(_this3.bitMap, index);
            }
            callback(counter, _this3.bitMap, changed);
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
          this.bitMapTrees[index].deallocate(counter, function (bitMap, changed) {
            if (bitMap && allSetPrior) {
              unsetBit(_this4.bitMap, index);
            }
            if (_this4.bitMapTrees.length - 1 === index && allUnset(bitMap)) {
              _this4.popChild();
            }
            callback(_this4.bitMap, changed);
          });
        } else {
          callback(null, null);
        }
      }

      /**
       * Checks if the counter has been set
       * @param {number} counter
       * @param {function} callback
       */

    }, {
      key: 'check',
      value: function check(counter, callback) {
        var index = Math.floor((counter - this.begin) / Math.pow(blockSize, this.depth));
        if (this.bitMapTrees[index]) {
          this.bitMapTrees[index].check(counter, function (set) {
            callback(set);
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
    _classCallCheck(this, Counter);

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
   * @param {?number} counter
   * @returns {number|boolean}
   * @throws {RangeError} - Will throw if the explicitly allocated counter is out of bounds
   */


  _createClass(Counter, [{
    key: 'allocate',
    value: function allocate(counter) {
      var index = null;
      var changed = void 0;
      if (counter !== undefined) {
        if (counter < this._begin) {
          throw new RangeError('Counter needs to be greater or equal to the counter beginning offset');
        }
        index = counter - this._begin;
      }
      this._bitMapTree.allocate(index, function (index_, bitMap, changed_) {
        index = index_;
        // this can be null if the index checked is outside of the tree
        changed = changed_;
      });
      if (index !== null) {
        if (counter != null) return changed;
        return index + this._begin;
      } else {
        var newRoot = new this._bitMapConst.Node(this._bitMapTree.begin, this._bitMapTree.depth + 1);
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

  }, {
    key: 'deallocate',
    value: function deallocate(counter) {
      var changed = void 0;
      this._bitMapTree.deallocate(counter - this._begin, function (bitMap, changed_) {
        // this can be null if the index checked is outside of the tree
        changed = changed_;
      });
      // an index outside of the tree is assumed to be unallocated
      return !!changed;
    }

    /**
     * Checks if a number has been allocated or not
     * @param {number} counter
     * @returns {boolean}
     */

  }, {
    key: 'check',
    value: function check(counter) {
      var set = void 0;
      this._bitMapTree.check(counter - this._begin, function (set_) {
        // this can be null if the index checked is outside of the tree
        set = set_;
      });
      // an index outside of the tree is assumed to be unallocated
      return !!set;
    }
  }]);

  return Counter;
}();

return Counter;

})));
