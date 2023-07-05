---
title: Concurrency
---

## Fine-Grain Locking

You may recall mutexes and reader-writers locks from the Pager assignment (if not, read that section of the Pager handout for a refresher) - in this assignment, we'll expand our usage of locks to make our B+Tree and hash table thread-safe using fine-grain locking.

Fine-grain locking is a locking technique that involves locking a part of a data structure to ensure safe access rather than locking the entire data structure. In B+Trees, this means only locking the nodes that we're currently looking at, and in a hash table, this means only locking the buckets we're currently looking at. Clearly this is desirable - now we can have multiple tenants safely traversing and modifying the data structure at the same time, leading to huge speed ups. However, getting fine-grain locking right is incredibly nuanced, as you'll learn in this assignment.

### Fine-Grain Locking on Pages

In the stencil code that we've provided, `Page`s have locks. Since the `Page` represents logical units in both hash tables and B+Trees, this `Lock` method will be instrumental in implementing the following two fine-grain locking schemes. 

### Fine-Grain Locking on Hash Tables

Hash tables are rather simple structures to lock; the only entrypoints into a bucket are through the lookup table. Therefore for each read or write, we only need to lock the lookup table, then the bucket!

On reads, we first acquire a read lock on the lookup table, then find our bucket. Next, we acquire a read lock on our bucket, then release our read lock on the lookup table, read our value, then release our read lock from the bucket.

On writes, we first acquire a read lock on the lookup table, then find and lock our bucket. We could have grabbed a write lock, but there's no need to grab a write lock on the lookup table unless we are sure that we are going to split; this is called **optimistic locking**, and can reduce unnecessary waiting for locks. After we've grabbed a write lock on the bucket, we check if we could potentially split (which essentially means checking if the bucket is currently full); if so, we grab a write lock on the lookup table and complete our insert and split. If we don't split, we simply insert. Afterwards, we release all of our locks. You aren't required to perform optimistic locking in this assignment - it's perfectly find just to grab the write lock from the get go. However, do ensure that you release the write lock if you don't need to hold onto it - otherwise, it's not fine-grain locking at all!

### Fine-Grain Locking on B+Trees

B+Trees are much more difficult structures to lock. There are few major concerns. Firstly, the structure of the tree can change under us as nodes split. Secondly, we don't want to be overly pessimistic in our locking, since holding a write lock on our root node locks all other clients out of the tree. Thirdly, table scans and queries get especially complicated, especially with resource locking below. And so on.

For sanity's sake, we will not be implementing fine-grain locking for selects, cursors, printing, or joins; we will focus on the main B+Tree operations: reading and writing. Primarily, we employ a scheme known as lock-crabbing which ensures that the structure of the database won't change underneath us as we acquire locks and traverse down the tree. The following is a brief overview of lock-crabbing.

On reads, we first acquire a read lock on the root node. Then, we find the child node we want to go to, and grab a read lock on the child node. Only after locking the child node do we unlock the parent (root) node. This is the essense of lock-crabbing and is how we ensure that the shape of the tree doesn't change underneath us. Consider the case where we release the lock on the root before grabbing one on the child. In that split second, another thread could split the root node, making the child node obsolete. Crabbing avoids this issue entirely. We continue in this fashion all the way down to our target leaf node, perform our read, then release our final lock.

On writes, we first acquire a write lock on the root node. Then, we find the child node we want to go to, and grab a write lock on this child node. We only release the write lock on our parent nodes if we can be sure that our child node will not split; if it can, then we hold onto the lock. Otherwise, we release the lock on our parent node and all other locks that we've been holding above us. It's worth thinking about how we can check if a child node could possibly split; this check is very similar to the one we would do in the hash table. As we recurse down, we hold locks on all parents that could potentially be affected by a node split. Eventually, we are guaranteed to unlock everything either after perfoming the write at a leaf node, or after a split is propagated up the tree. Because this algorithm is rather complicated, we've written a help doc [here](/misc/locking). Please use this and the associated helper functions in `btree_subr.go` when implementing locking!


## Transactions

Transactions are a way of grouping multiple actions into one, ACID-compliant package. That is to say, we are guaranteed that either all of the actions in a transaction succeed or none of them succeed, and that they are isolated from other transactions. Transactions acquire locks on the resources they are accessing to be sure that they can read and write safely. Critically, notice that the nature of transaction-level locks and data structure-level locks are very different. Transaction locks are completely unaware of the underlying representation of the data; we're only concerned in logical units to preserve the integrity of the external view of the database. On the other hand, data structure-level locks are completely unaware of the data its locking; only the structure of how the data is stored. Thus, these two locking schemes are completely orthogonal to one another, and yet, are both essential for a database serving multiple tenants concurrently.

### Strict 2PL

Our transactions will adhere to strict two-phase locking. That is, we will acquire locks as we need them, but we will hold on to all of them until after we have committed our changes to the database. **One great corrolary of this scheme is that we can be absolutely sure that there will not be cascading rollbacks**; that is, if a transaction aborts, no other transaction will have to rollback because of it! This makes our lives a lot easier when implementing aborts, but it does mean that our transactions may wait unnecessarily for resources to open.

### Deadlock Avoidance

We want to be sure that our transactions don't end up creating a deadlock; one way to do this is by detecting cycles in a "waits-for" graph. While a transaction is waiting for another transaction to free a particular resource, we should add an edge between it and the offending transaction to the "waits-for" graph. If a cycle is detected in this graph, that means that there is a cycle of transactions waiting for each other, meaning we have deadlocked and will not be able to proceed without killing off a transaction. As a matter of convention, the last transaction to join the graph should be the one that aborts. Critically, remember to remove edges between transactions once transactions die or are otherwise no longer waiting for a resource - otherwise, you may detect deadlocks that don't exist!

