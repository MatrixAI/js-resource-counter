import test from 'ava';
import CounterImmutable from '../lib/CounterImmutable.js';

test('allocate sequentially', t => {
  const startingOffset = 10;
  let cNext = new CounterImmutable(startingOffset);
  let assigned;
  let changed;
  for (let i = 10; i < 1000; ++i) {
    [assigned, cNext] = cNext.allocate();
    t.is(assigned, i);
  }
  for (let i = 999; i > 9; --i) {
    [changed, cNext] = cNext.deallocate(i);
    t.is(changed, true);
  }
  [changed, cNext] = cNext.allocate(1000);
  t.is(changed, true);
  for (let i = 10; i < 1000; ++i) {
    [assigned, cNext] = cNext.allocate();
    t.is(assigned, i);
  }
  [changed, cNext] = cNext.deallocate(startingOffset + 1024);
  t.is(changed, false);
});

test('allocate explicitly', t => {
  let cNext = new CounterImmutable(0);
  let assigned;
  let changed;
  [changed, cNext] = cNext.allocate(1);
  t.is(changed, true);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 0);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 2);
  [changed, cNext] = cNext.allocate(1);
  t.is(changed, false);
  [changed, cNext] = cNext.deallocate(1);
  t.is(changed, true);
  [changed, cNext] = cNext.deallocate(1);
  t.is(changed, false);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 1);
  [changed, cNext] = cNext.allocate(32);
  t.is(changed, true);
  [changed, cNext] = cNext.allocate(500);
  t.is(changed, true);
  for (let i = 3; i < 32; ++i) {
    [assigned, cNext] = cNext.allocate();
    t.is(assigned, i);
  }
  for (let i = 33; i < 500; ++i) {
    [assigned, cNext] = cNext.allocate();
    t.is(assigned, i);
  }
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 501);
});

test('reuse deallocated counters sequentially', t => {
  let cNext = new CounterImmutable(0);
  let assigned;
  let changed;
  let first;
  [first, cNext] = cNext.allocate();
  [, cNext] = cNext.allocate();
  let third;
  [third, cNext] = cNext.allocate();
  [, cNext] = cNext.allocate();
  let fifth;
  [fifth, cNext] = cNext.allocate();
  let last;
  for (let i = 0; i < 200; ++i) {
    [last, cNext] = cNext.allocate();
  }
  [, cNext] = cNext.deallocate(first);
  [, cNext] = cNext.deallocate(third);
  [, cNext] = cNext.deallocate(fifth);
  let first_, third_, fifth_, last_;
  [first_, cNext] = cNext.allocate();
  [third_, cNext] = cNext.allocate();
  [fifth_, cNext] = cNext.allocate();
  [last_, cNext] = cNext.allocate();
  t.is(first_, first);
  t.is(third_, third);
  t.is(fifth_, fifth);
  t.is(last_, last + 1);
});

test('check counter', t => {
  let cNext = new CounterImmutable(0);
  let changed;
  changed  = cNext.check(100);
  t.is(changed, false);
  [changed, cNext] = cNext.allocate(100);
  t.is(changed, true);
  changed = cNext.check(100);
  t.is(changed, true);
  [changed, cNext] = cNext.deallocate(100);
  t.is(changed, true);
  changed = cNext.check(100);
  t.is(changed, false);
});

test('transactional operations', t => {
  let cOrig = new CounterImmutable(0);
  let cNext;
  // a transaction that did nothing doesn't create anything
  cNext = cOrig.transaction((ct) => {
    t.is(ct.check(1), false);
    t.is(ct.check(100000), false);
  });
  t.is(cNext, cOrig);
  // a transaction that changed things must not return the same counter
  cNext = cNext.transaction((ct) => {
    t.is(ct.allocate(), 0);
    t.is(ct.allocate(), 1);
    t.is(ct.check(0), true);
    t.is(ct.deallocate(0), true);
    t.is(ct.deallocate(1), true);
    t.is(ct.check(0), false);
  });
  t.not(cNext, cOrig);
  [, cNext] = cNext.allocate();
  // this cNext_ will be a copy of the cNext
  // so it must not be the same object
  let cNext_;
  cNext = cNext.transaction((ct) => {
    t.is(ct.check(0), true);
    t.is(ct.deallocate(0), true);
    cNext_ = cNext.transaction((ct) => {
      t.is(ct.check(0), true);
      t.is(ct.deallocate(0), true);
    });
  });
  t.not(cNext, cNext_);
  t.is(cNext.check(0), false);
  t.is(cNext_.check(0), false);
});

test('full persistence', t => {
  let c1, c2, c3;
  let assigned, changed;
  c1 = new CounterImmutable(0);
  [assigned, c2] = c1.allocate();
  t.is(assigned, 0);
  [assigned, c3] = c2.allocate();
  t.is(assigned, 1);
  t.not(c1, c2);
  t.not(c2, c3);
  // c1 query and updates
  t.is(c1.check(0), false);
  [assigned,] = c1.allocate();
  t.is(assigned, 0);
  t.is(c1.check(0), false);
  // c2 query and updates
  t.is(c2.check(0), true);
  [assigned,] = c2.allocate();
  t.is(assigned, 1);
  [changed,] = c2.deallocate(0);
  t.is(changed, true);
  t.is(c2.check(1), false);
  // c3 query and updates
  t.is(c3.check(0), true);
  t.is(c3.check(1), true);
  [assigned,] = c3.allocate();
  t.is(assigned, 2);
  [changed,] = c3.deallocate(0);
  t.is(changed, true);
  [changed,] = c3.deallocate(1);
  t.is(changed, true);
  t.is(c3.check(2), false);
});
