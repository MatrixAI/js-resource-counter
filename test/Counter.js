import test from 'ava';
import Counter from '../lib/Counter';

test('allocate sequentially', t => {
  const startingOffset = 10;
  const c = new Counter(startingOffset);
  for (let i = 10; i < 1000; ++i) {
    t.is(c.allocate(), i);
  }
  for (let i = 999; i > 9; --i) {
    t.is(c.deallocate(i), true);
  }
  t.is(c.allocate(1000), true);
  for (let i = 10; i < 1000; ++i) {
    t.is(c.allocate(), i);
  }
  t.is(c.deallocate(startingOffset + 1024), false);
});

test('allocate explicitly', t => {
  const c = new Counter(0);
  t.is(c.allocate(1), true);
  t.is(c.allocate(), 0);
  t.is(c.allocate(), 2);
  t.is(c.allocate(1), false);
  t.is(c.deallocate(1), true);
  t.is(c.deallocate(1), false);
  t.is(c.allocate(), 1);
  t.is(c.allocate(32), true);
  t.is(c.allocate(500), true);
  for (let i = 3; i < 32; ++i) {
    t.is(c.allocate(), i);
  }
  for (let i = 33; i < 500; ++i) {
    t.is(c.allocate(), i);
  }
  t.is(c.allocate(), 501);
});

test('reuse deallocated counters sequentially', t => {
  const c = new Counter();
  const first = c.allocate();
  c.allocate();
  const third = c.allocate();
  c.allocate();
  const fifth = c.allocate();
  let last;
  for (var i = 0; i < 200; ++i) {
    last = c.allocate();
  }
  c.deallocate(first);
  c.deallocate(third);
  c.deallocate(fifth);
  t.is(c.allocate(), first);
  t.is(c.allocate(), third);
  t.is(c.allocate(), fifth);
  t.is(c.allocate(), last + 1);
});

test('check counter', t => {
  const c = new Counter;
  t.is(c.check(100), false);
  t.is(c.allocate(100), true);
  t.is(c.check(100), true);
  t.is(c.deallocate(100), true);
  t.is(c.check(100), false);
});

// shrinking performance tests rely on internal behaviour of the Counter

test('shrinking on leaf', t => {
  let blockSize = 32;
  let c = new Counter(0, blockSize);
  let i;
  // allocate 2 * block size
  for (i = 0; i < blockSize * 2; ++i) {
    c.allocate();
  }
  t.is(c._bitMapTree.bitMapTrees.length, 2);
  // deallocate the second terminal block
  for (i = blockSize; i < blockSize * 2; ++i) {
    c.deallocate(i);
  }
  // terminal block should be deleted
  t.is(c._bitMapTree.bitMapTrees.length, 1);
  t.is(c.allocate(), blockSize);
  t.is(c._bitMapTree.bitMapTrees.length, 2);
  t.is(c.allocate(), blockSize + 1);
  // deallocate the first block
  for (i = 0; i < blockSize; ++i) {
    c.deallocate(i);
  }
  // initial block should not be deleted
  t.is(c._bitMapTree.bitMapTrees.length, 2);
  t.is(c.allocate(), 0);
});

test('shrinking and propagating up the tree', t => {
  let blockSize = 32;
  let c = new Counter(0, blockSize);
  let i;
  // allocate to depth 2, but multiply by 2 requiring 2 branches
  for (i = 0; i < (blockSize ** 2) * 2; ++i) {
    c.allocate();
  }
  t.is(c._bitMapTree.bitMapTrees.length, 2);
  // deallocate second half of the second branch
  for (i = ((blockSize ** 2) * 1.5); i < (blockSize ** 2) * 2; ++i) {
    c.deallocate(i);
  }
  t.is(c._bitMapTree.bitMapTrees.length, 2);
  // now deallocate first half of the second branch
  for (i = (blockSize ** 2); i < (blockSize ** 2) * 1.5; ++i) {
    c.deallocate(i);
  }
  t.is(c._bitMapTree.bitMapTrees.length, 1);
  t.is(c.allocate(), (blockSize ** 2));
  t.is(c._bitMapTree.bitMapTrees.length, 2);
});
