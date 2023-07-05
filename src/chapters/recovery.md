---
title: Recovery
---

## Write-Ahead Logging

When our database crashes, we lose everything that was stored in volatile memory. Write-ahead logging aims to solve this problem by storing enough information to recreate the state of the database after a crash.

In write-ahead logging, we write a log specifying the action we undertook *before* we actually do it. For example, if we inserted (10, 10) into the database, we would write a log that might look like "< Tx1, INSERT, 10, 10, tablename >", indicating that transaction 1 inserted the value (10, 10) into table "tablename". If we do this for every write action a database undertakes, then we will be able to recover just by **replaying** the log!

You might be tempted to remark that write-ahead logging seems redundant and slow; why don't we just save the state of the database each time? The nature of write-ahead logging makes writing a log much less expensive than flushing a page: in short, appending a string to a file is much cheaper than mutating a data structure and flushing the corresponding pages.

## Log Types

There are five kinds of logs in our database: TABLE logs, EDIT logs, START logs, COMMIT logs, and CHECKPOINT logs.

TABLE logs signify the creation of a table. The structure of a TABLE log is `< create tblType table tblName >`, where `tblType` is either `hash` or `btree`, and `tblName` is the name of the table.

EDIT logs signify actions that have modified the state of the database; for example, before a database insertion, deletion, or update, an EDIT log is written to disk. The structure of an EDIT log is `< Tx, table, INSERT|DELETE|UPDATE, key, oldval, newval >`, where `Tx` is the transaction that undertook this edit, `table` is the affected table, `key` is the affected key, and `oldval` and `newval` after the before and after results. Note that `oldval` xor `newval` can be null - think about why!

START logs signify the beginning of a new transaction. The structure of a START log is `< Tx start >`.

COMMIT logs signify the end of a running transaction. The structure of a COMMIT log is `< Tx commit >`.

CHECKPOINT logs list the currently running transactions and guarantee that all memory has been flushed to disk. The structure of a CHECKPOINT log is `< Tx1, Tx2... checkpoint >`.

Using these logs, we can define a recovery algorithm that can recovery from any database crash. We've handled the serialize and deserialize functions for you in the code; this will be useful, though, if you decide to debug by looking at your WAL.

## Checkpoints

You might be wondering what a CHECKPOINT log is for. Let's say we've crashed and decide to recover our database by replaying our logs. You may have noticed that it is rather inefficient to replay a database's entire history. Especially since our database already has data stored on disk, we want to do the minimum amount of work required to restore the database.

To achieve this, we use **checkpoints**. A checkpoint is a point in the logs where we can be sure that all data in memory was flushed to disk. In other words, there is no need to replay information up to a checkpoint, since it already exists on disk. A checkpoint log also contains information specifying which transactions are currently active; as you will see soon, this is imperative for recovery, since it gives us information about what instructions should actually be undone.

When we call `checkpoint` on the REPL, we first flush all pages to disk, then write a checkpoint log to disk. This order is important; if we wrote the log first, but crashed during the flush itself, our recovery algorithm would not work!

## The Recovery Algorithm

Now that we have all of the groundwork we need, let's formalize the recovery algorithm. It goes as follows:

1. Seek backwards through the logs to the most recent checkpoint and note which transactions are currently active using the information in the checkpoint log.
2. Redo all actions from the most recent checkpoint to the end of the log, keeping track of which transactions are active. These actions **should not** be logged.
3. Undo all actions that belong to active transactions from the end of the log to the start of the logs in reverse order. These actions **should** be logged.

We encourage you to think about the following cases and why this algorithm properly restores the database:

- A transaction began before a checkpoint and commited after.
- A transaction began before a checkpoint and never committed.
- A transaction began after a checkpoint and commited after.
- A transaction began after a checkpoint and never commited.
- A transaction began before a checkpoint and commited after, but some of its results were already written out to disk.
- A transaction begin before a checkpoint and committed after, and another transaction with the same name began after as well, and never committed.
- And so on...
