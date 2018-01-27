import test from 'ava';
import { Leaf, Node } from '../lib/BitMapTree.js';

test('shrinking on leaf', t => {
  const blockSize = 32;
  let tree;
  tree = new Leaf(blockSize, true, 0);
  // allocate 2 * blockSize
  for (let i = 0; i < blockSize * 2; ++ i) {
    tree.allocate(null, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  // tree grows into a Node
  t.true(tree instanceof Node);
  t.is(tree.bitMapTrees.length, 2);
  // deallocate the second terminal block
  for (let i = blockSize; i < blockSize * 2; ++i) {
    tree.deallocate(i, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  // terminal block should be deleted
  t.is(Object.keys(tree.bitMapTrees).length, 1);
  tree.allocate(null, ({counter, tree: tree_}) => {
    t.is(counter, blockSize);
    tree = tree_;
  });
  t.is(Object.keys(tree.bitMapTrees).length, 2);
  tree.allocate(null, ({counter, tree: tree_}) => {
    t.is(counter, blockSize + 1);
    tree = tree_;
  });
  // deallocate the first block
  for (let i = 0; i < blockSize; ++i) {
    tree.deallocate(i, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  // initial block should be deleted
  t.is(tree.bitMapTrees.length, 2);
  t.is(Object.keys(tree.bitMapTrees).length, 1);
  tree.allocate(null, ({counter, tree: tree_}) => {
    t.is(counter, 0);
    tree = tree_;
  });
});

test('shrinking and propagating up the tree', t => {
  const blockSize = 32;
  let tree = new Leaf(blockSize, true, 0);
  // allocate to depth 2, but multiplying by 2 requiring 2 branches
  // the result is a single node with 2 nodes, each containing 32 leafs
  for (let i = 0; i < (blockSize ** 2) * 2; ++i) {
    tree.allocate(null, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  t.true(tree instanceof Node);
  t.is(tree.bitMapTrees.length, 2);
  // deallocate second half of the second branch
  for (let i = ((blockSize ** 2) * 1.5); i < (blockSize ** 2) * 2; ++i) {
    tree.deallocate(i, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  t.is(tree.bitMapTrees.length, 2);
  // now deallocate first half of the second branch
  for (let i = (blockSize ** 2); i < (blockSize ** 2) * 1.5; ++i) {
    tree.deallocate(i, ({tree: tree_}) => {
      tree = tree_;
    });
  }
  t.is(tree.bitMapTrees.length, 2);
  t.is(Object.keys(tree.bitMapTrees).length, 1);
  tree.allocate(null, ({counter, tree: tree_}) => {
    t.is(counter, blockSize ** 2);
    tree = tree_;
  });
  t.is(tree.bitMapTrees.length, 2);
  t.is(Object.keys(tree.bitMapTrees).length, 2);
});

test('growing and shrinking by 100000', t => {
  let tree = new Leaf(32, true, 0);
  for (let i = 0; i < 100000; ++i) {
    tree.allocate(null, ({counter, tree: tree_}) => {
      t.is(counter, i);
      tree = tree_;
    });
  }
  for (let i = 0; i < 100000; ++i) {
    tree.deallocate(i, ({changed, tree: tree_}) => {
      t.is(changed, true);
      tree = tree_;
    });
  }
  t.true(tree instanceof Node);
  t.is(tree.depth, 3);
  t.is(Object.keys(tree.bitMapTrees).length, 0);
});

test('growing and shrinking by 100000 via snapshots', t => {
  const blockSize = 32;
  const tree = new Leaf(blockSize, true, 0);
  const snapshot = new WeakSet;
  let treeNew = tree;
  for (let i = 0; i < 100000; ++i) {
    treeNew.allocate(null, ({tree}) => {
      treeNew = tree;
    }, snapshot);
  }
  for (let i = 99999; i >= 0; --i) {
    treeNew.deallocate(i, ({tree}) => {
      treeNew = tree;
    }, snapshot);
  }
  t.true(tree instanceof Leaf);
  t.true(treeNew instanceof Node);
  t.is(treeNew.depth, 3);
  t.is(Object.keys(treeNew.bitMapTrees).length, 0);
});
