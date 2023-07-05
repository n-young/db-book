---
title: B+Tree Indexes
---

## BTrees

![btree](/static/posts/project/b+tree/btree.jpeg)

To understand B+Trees, we should first cover what a BTree is. A BTree is a self-balancing recursive data structure that allows logarithmic time search, insertion, and deletion. It is a generalization of the binary search tree in that each node can have more than 1 search key and more than 2 children. A BTree of order $m$ is formally defined as a tree that satisfies the following properties:

- Each node has at most $m$ children,
- Every non-leaf (internal) node has at least $\lceil m/2 \rceil$ children,
- The root has at least two children unless it is a leaf node,
- A non-leaf node with $k$ children contains $k-1$ keys,
- All leaves appear on the same level and carry no information.

One way to visualize what an internal node looks like is an array of $2k-1$ values, alternating between a child node pointer and a key: 

```
[child_1, key_1, child_2, key_2, ..., key_k-1, child_k]
```

And a leaf node is similarly visualizable, except that there is a one-to-one correspondence between keys and values, making it an array of $2k$ values:

```
[key_1, value_1, key_2, value_2, ..., value_k-1, key_k, value_k]
```

Critically, all of the values of a node in between two values must be between those two values. So, there will never be any keys less than `key_1` or greater than `key_2` in `child_2` or any of its descendants. This mirrors the invariant present in any search tree.

This data structure supports search, insertion, and deletion. Updates are supported as well, but can be thought of as a deletion followed by a subsequent insertion. We describe each of these algorithms.

**Search** - to search for a entry, we start at the root node. If the entry we're looking for is in this node, we return it. Otherwise, we binary search over the keys to find the branch that our desired entry could be in, and repeat this process for that child node until we either find the entry or bottom out.

**Insertion** - to insert a entry, we start at the root node. Then, we traverse to a leaf node and insert the entry in the correct spot, assuming the entry doesn't already exist. If the leaf node *overflows* (i.e. has more than $k$ entries), then we need to *split* it so that our BTree is still valid. To split a leaf node, we create a new leaf node and transfer half of the entries (not including the median) over to the new leaf node. Then, we take the median element and push that value up into the parent node to serve as a separator key for our two new nodes. If the parent node overflows, we repeat this process for that node.

**Deletion** - to delete a value, we first find the value (if it exists), then we remove it. This operation becomes rather complicated when nodes underflow (less than $\lceil m/2 \rceil$ children), or when deleting a value from an internal node; we leave it as an exercise to the reader to explore this operation.

To explore how some of these BTree operations work, try out this [online visualization](https://www.cs.usfca.edu/~galles/visualization/BTree.html).


## B+Trees

![b+tree](/static/posts/project/b+tree/b+tree.jpeg)

Now that we understand BTrees, it's time to explore what a B+Tree is. A B+Tree is a BTree with a few important changes:

- Each leaf node has a pointer to its right neighbor. This makes linear scans much easier, since we don't have to traverse the tree structure to get to the next leaf node.
- Internal nodes store duplicates of values in leaf nodes. Critically, when a leaf node splits, it doesn't push any entries up to the parent; rather, it only pushes a copy of the entry up. This means that if we were to scan every leaf node, we would retrieve every value in the tree.

Otherwise, everything else is the same as in a BTree. This structure is better optimized for when data you're looking for is on disk, since internal nodes only need to store keys, and then all of the large values are kept on leaf nodes. In our scheme, each node corresponds to a page, meaning the number of pages we have to read in to find a particular value is equal to the height of our B+Tree.

The operations in a B+Tree are slightly different:

**Search** - to search for a value, we start at the root node and traverse all the way to the correct leaf node, using binary search to descend quickly. Once we arrive at the leaf node, binary search for the value.

**Insertion** - to insert a value, we start at the root node. Then, we traverse to a leaf node and insert the value in the correct spot. If the leaf node *overflows* (i.e. has more than $k$ values), then we need to *split* it so that our BTree is still valid. To split a leaf node, we create a new leaf node and transfer half of the values (including the median) over to the new leaf node. Then, we take a copy of the median element and push that value up into the parent node to serve as a separator key for our two new nodes. If the parent node overflows, we repeat this process for that node. The main difference here is that we duplicate the median key when we split.

**Deletion** - to delete a value, we first find the value in a leaf node(if it exists), then we remove it. This operation becomes rather complicated when nodes underflow (less than $\lceil m/2 \rceil$ children), or when deleting a value from an internal node; we leave it as an exercise to the reader to explore this operation.

To explore how some of these B+Tree operations work, try out this [online visualization](https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html).

### Split Indexing

Splitting a node is actually quite a tricky operation which requires careful indexing; to help you wrap your head around the implementation of this opereation, we provide the following example. Let's say our internal node looks like this:

```
[child_0, key_0, child_1, key_1, child_2, key_2, child_3, key_3, child, key_4, child_5]
```

and then our second child (child index = 1) splits. Here's the node after the split, with `child*` as the new child, and `key*` the new key.

```
[child_0, key_0, child_1, key*, child*, key_1, child_2, key_2, child_3, key_3, child, key_4, child_5]
```

Notice how many keys and how many children we shifted. We shifted 3 of each. Next, notice the indices of the keys and children that we shifted. We shifted child indexes 3 and above, and we shifted key indexes 2 and above. **The indexes for the keys and children we moved do not match up!** Be careful about this nuance when you implement splits for internal nodes!


## Cursors

One of the B+Tree's biggest optimization is the existence of links between leaf nodes to allow faster linear scans. A cursor is an abstraction that takes advantage of these links to carry out selections quickly.

Essentially, a cursor is a data structure that points to a particular part of another data structure, with a few options for movement and action. A cursor typically has two operations: `StepForward` and `GetEntry`. `StepForward` steps the cursor over the next value; for example, if we are in the middle of a node, it moves on to the next value, otherwise, it skips over to the next node. `GetEntry` returns the value that the cursor is currently pointing at for the surrounding program to handle. Critically, in a B+Tree, a cursor never needs to be in an internal node, making it an easy to understand and simple to use abstraction.
