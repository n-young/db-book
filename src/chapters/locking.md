---
title: Locking
---

This chapter is all about locking. In particular, we learn how to can lock our index structures to keep them thread-safe.

## Fine-Grain Locking

Reductively, to achieve thread-safety, we can simply lock the entire index to allow only one thread to access it at a time. This isn't very interesting, however, and completely loses out on the benefits of concurrency. Instead, we will apply fine-grained locking to allow multiple threads to use different parts of our index at a time.

Fine-grain locking is a locking technique that involves locking a part of a data structure to ensure safe access rather than locking the entire data structure. In B+Trees, this means only locking the nodes that we're currently looking at, and in a hash table, this means only locking the buckets we're currently looking at. Clearly this is desirable - now we can have multiple tenants safely traversing and modifying the data structure at the same time, leading to huge speed ups.

## Fine-Grain Locking on Hash Tables

Hash tables are rather simple structures to lock; the only entrypoints into a bucket are through the lookup table. Therefore for each read or write, we only need to lock the lookup table, then the bucket!

On reads, we first acquire a read lock on the lookup table, then find our bucket. Next, we acquire a read lock on our bucket, then release our read lock on the lookup table, read our value, then release our read lock from the bucket.

On writes, we first acquire a read lock on the lookup table, then find and lock our bucket. We could have grabbed a write lock, but there's no need to grab a write lock on the lookup table unless we are sure that we are going to split; this is called **optimistic locking**, and can reduce unnecessary waiting for locks. After we've grabbed a write lock on the bucket, we check if we could potentially split (which essentially means checking if the bucket is currently full); if so, we grab a write lock on the lookup table and complete our insert and split. If we don't split, we simply insert. Afterwards, we release all of our locks.

## Fine-Grain Locking on B+Trees

B+Trees are comparatively difficult structures to lock. In addition to having many more moving parts, this is primarily because we may need to split or coalesce nodes after we insert or delete values, which means that the same locking strategy will not work in all cases. We'll look through a detailed protocol and see how to handle all cases when the B+Tree may split (this protocol assumes that the B+Tree in question never coalesces).

### The Simple Case

Let's say we want to lock a B+Tree to be thread-safe. Assume for now that we won't change the structure of the B+Tree while we traverse it (i.e. we will not cause a split). Then, the locking scheme is rather simple where `current.child` is found by correctly binary searching:

```
lock(current)
while current.child != nil:
    lock(current.child)
    unlock(current)
    current = current.child
current.read()
unlock(current)
```

Critically, we do what is more commonly known as **hand-over-hand locking** or **lock crabbing**, which ensures that we always have at least one point of contact in the database. If we flipped the lock of the child node and the unlock of the current node, there will be a split second where the child could move out from underneath us, making our locking algorithm unsafe. Thus, we always ensure that we are holding at least one lock until we finish.

### The Complex Case

We've just gone over the simple case, which is the case where we can't cause a split. Let's lift this assumption and see what happens as a result.

Say we insert a tuple, Consider the following tree traversal, where each node is marked `x` if it might split (we know a node may split if the insertion of one more entry would cause it to split):

```
[x] => [x] => [x] => [x] => [x]
```

Since every node might split, the node above it might change, meaning that it doesn't make sense to release any locks until after we finish our entire insertion. We can imagine the case where a split in a leaf triggers a split in the root node; therefore, we want to keep the root node locked so long as its possible that it may have to handle a split or split itself.

Let's go through a few more examples:

```
[x] => [x] => [ ] => [x] => [x]
```

Here, since our 3rd node has no chance of splitting, there is no need for us to continue holding locks on the 1st and 2nd nodes as we traverse further down the tree. So we don't need to hold locks until completion - when we encounter a node that definitely won't split, none of its parent locks need to be help anymore (note that we should lock the child node before unlocking the parent nodes to avoid the problem described in the simple case).

Another:

```
[] => [] => [] => [] => [x]
```

In this case, we should hold on to locks on the last two nodes only. This is because if the last node splits, the second last node will have to shift keys around to accomodate it.

And a last one:

```
[x] => [x] => [x] => [x] => []
```

In this case, when we arrive at the leaf node, we can check that it will never split, meaning that we can unlock all of its parent nodes.

### The Complex Case + Splitting

So far we have an incomplete policy. Here it is in summary:

```
lock(currentNode)
unlockParentsMaybe(currentNode)
recur(child)
```

But we need to handle two more small details.

Firstly, we need to make sure that a leaf node always unlocks itself, since no other node will, and that the parents definitely get unlocked, since if the leaf node doesn't trigger it before the insert ends, nobody will:

```
lock(currentNode)
unlockParentsMaybe(currentNode)
if child != nil:
    recur(child)
else:
    write(currentNode)
    unlock(currentNode)
    unlockParentsDefinitely(currentNode)
```

Secondly, when we handle a split, there are two cases. Either we also split, or we don't. In the former case, we can definitely unlock all parents; in the latter, we can't. In both cases, we know that no child has unlocked us, so we definitely have to unlock ourselves (think about it: if a child had unlocked us, but we recieved a split, this means someone screwed up):

```
lock(currentNode)
unlockParentsMaybe(currentNode)
if child != nil:
    split = recur(child)
    if not split:
        unlockParentsDefinitely(currentNode)
    unlock(currentNode)
else:
    split = write(currentNode)
    if not split:
        unlockParentsDefinitely(currentNode)
    unlock(currentNode)
```

This completes our protocol.
