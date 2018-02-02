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
    t.true(changed);
  }
  [changed, cNext] = cNext.allocate(1000);
  t.true(changed);
  for (let i = 10; i < 1000; ++i) {
    [assigned, cNext] = cNext.allocate();
    t.is(assigned, i);
  }
  [changed, cNext] = cNext.deallocate(startingOffset + 1024);
  t.false(changed);
});

test('allocate explicitly', t => {
  let cNext = new CounterImmutable(0);
  let assigned;
  let changed;
  [changed, cNext] = cNext.allocate(1);
  t.true(changed);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 0);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 2);
  [changed, cNext] = cNext.allocate(1);
  t.false(changed);
  [changed, cNext] = cNext.deallocate(1);
  t.true(changed);
  [changed, cNext] = cNext.deallocate(1);
  t.false(changed);
  [assigned, cNext] = cNext.allocate();
  t.is(assigned, 1);
  [changed, cNext] = cNext.allocate(32);
  t.true(changed);
  [changed, cNext] = cNext.allocate(500);
  t.true(changed);
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
  t.false(changed);
  [changed, cNext] = cNext.allocate(100);
  t.true(changed);
  changed = cNext.check(100);
  t.true(changed);
  [changed, cNext] = cNext.deallocate(100);
  t.true(changed);
  changed = cNext.check(100);
  t.false(changed);
});

test('transactional operations', t => {
  let cOrig = new CounterImmutable(0);
  let cNext;
  // a transaction that did nothing doesn't create anything
  cNext = cOrig.transaction((ct) => {
    t.false(ct.check(1));
    t.false(ct.check(100000));
  });
  t.is(cNext, cOrig);
  // a transaction that changed things must not return the same counter
  cNext = cNext.transaction((ct) => {
    t.is(ct.allocate(), 0);
    t.is(ct.allocate(), 1);
    t.true(ct.check(0));
    t.true(ct.deallocate(0));
    t.true(ct.deallocate(1));
    t.false(ct.check(0));
  });
  t.not(cNext, cOrig);
  [, cNext] = cNext.allocate();
  // this cNext_ will be a copy of the cNext
  // so it must not be the same object
  let cNext_;
  cNext = cNext.transaction((ct) => {
    t.true(ct.check(0));
    t.true(ct.deallocate(0));
    cNext_ = cNext.transaction((ct) => {
      t.true(ct.check(0));
      t.true(ct.deallocate(0));
    });
  });
  t.not(cNext, cNext_);
  t.false(cNext.check(0));
  t.false(cNext_.check(0));
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
  t.false(c1.check(0));
  [assigned,] = c1.allocate();
  t.is(assigned, 0);
  t.false(c1.check(0));
  // c2 query and updates
  t.true(c2.check(0));
  [assigned,] = c2.allocate();
  t.is(assigned, 1);
  [changed,] = c2.deallocate(0);
  t.true(changed);
  t.false(c2.check(1));
  // c3 query and updates
  t.true(c3.check(0));
  t.true(c3.check(1));
  [assigned,] = c3.allocate();
  t.is(assigned, 2);
  [changed,] = c3.deallocate(0);
  t.true(changed);
  [changed,] = c3.deallocate(1);
  t.true(changed);
  t.false(c3.check(2));
});

test.cb('transaction operations that are asynchronous will diverge the trees - async', t => {
  let c = new CounterImmutable;
  c = c.transaction((ct) => {
    // the transaction will finish before this async code runs
    setTimeout(() => {
      // the ct here now refers to a different tree
      ct.allocate(100);
      t.true(ct.check(100));
      // c which is now the returned counter from the transaction
      // still doesn't have the 100 allocated
      t.false(c.check(100));
      t.end();
    }, 1);
    t.false(ct.check(100));
  });
  t.false(c.check(100));
});
