---
title: Transactions
---

## Transactions

Transactions are a way of grouping multiple actions into one, ACID-compliant package. That is to say, we are guaranteed that either all of the actions in a transaction succeed or none of them succeed, and that they are isolated from other transactions. Transactions acquire locks on the resources they are accessing to be sure that they can read and write safely. Critically, notice that the nature of transaction-level locks and data structure-level locks are very different. Transaction locks are completely unaware of the underlying representation of the data; we're only concerned in logical units to preserve the integrity of the external view of the database. On the other hand, data structure-level locks are completely unaware of the data its locking; only the structure of how the data is stored. Thus, these two locking schemes are completely orthogonal to one another, and yet, are both essential for a database serving multiple tenants concurrently.

### Strict 2PL

Our transactions will adhere to strict two-phase locking. That is, we will acquire locks as we need them, but we will hold on to all of them until after we have committed our changes to the database. **One great corrolary of this scheme is that we can be absolutely sure that there will not be cascading rollbacks**; that is, if a transaction aborts, no other transaction will have to rollback because of it! This makes our lives a lot easier when implementing aborts, but it does mean that our transactions may wait unnecessarily for resources to open.

### Deadlock Avoidance

We want to be sure that our transactions don't end up creating a deadlock; one way to do this is by detecting cycles in a "waits-for" graph. While a transaction is waiting for another transaction to free a particular resource, we should add an edge between it and the offending transaction to the "waits-for" graph. If a cycle is detected in this graph, that means that there is a cycle of transactions waiting for each other, meaning we have deadlocked and will not be able to proceed without killing off a transaction. As a matter of convention, the last transaction to join the graph should be the one that aborts. Critically, remember to remove edges between transactions once transactions die or are otherwise no longer waiting for a resource - otherwise, you may detect deadlocks that don't exist!

