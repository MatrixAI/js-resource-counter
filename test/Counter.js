import test from 'ava';
import Counter from '../lib/Counter.js';

test('allocate sequentially', t => {
  const startingOffset = 10;
  const c = new Counter(startingOffset);
  for (let i = 10; i < 1000; ++i) {
    t.is(c.allocate(), i);
  }
  for (let i = 999; i > 9; --i) {
    t.true(c.deallocate(i));
  }
  t.true(c.allocate(1000));
  for (let i = 10; i < 1000; ++i) {
    t.is(c.allocate(), i);
  }
  t.false(c.deallocate(startingOffset + 1024));
});

test('allocate explicitly', t => {
  const c = new Counter(0);
  t.true(c.allocate(1));
  t.is(c.allocate(), 0);
  t.is(c.allocate(), 2);
  t.false(c.allocate(1));
  t.true(c.deallocate(1));
  t.false(c.deallocate(1));
  t.is(c.allocate(), 1);
  t.true(c.allocate(32));
  t.true(c.allocate(500));
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
  t.false(c.check(100));
  t.true(c.allocate(100));
  t.true(c.check(100));
  t.true(c.deallocate(100));
  t.false(c.check(100));
});
