---
title: Hash Indexes
---

## Extendible Hashing

As you know from lecture, extendible hashing is a method of hashing that adapts as you insert more and more data. This is a direct upgrade from static hashing, which doesn't adapt as the amount of entries grows, thus leading to inefficient lookups later on. For direct lookups, extendible hashing can be a very efficient and lightweight indexing solution. However, it does not support range queries or maintain any sorted order, making it less than ideal as a general purpose indexing scheme like a B+Tree.

An extendible hash table has two moving parts: the table and the buckets. The table is essentially an array of pointers to buckets. Each bucket has a *local depth*, denoted $d_i$ , which is the number of trailing bits that every element in that bucket has in common. The table has a *global depth*, denoted $d$ , that is the maximum of the buckets' local depths.

A hash table also has an associated hash function. Ideally, this hash function is fast and uniform across the output space, meaning that keys will be uniformly distributed across the buckets. In this implementation, we use [xxhash](https://github.com/cespare/xxhash) since it is the state of the art, but really, many other hash functions would work just fine. You won't need to call this hash function directly; just use the `Hasher` function in the `hash_subr.go` file.

### Basic Operations

When a hash table performs **lookup**, the search key is hashed, and then the table is used to determine the bucket that we should look at. The last $d$ bits of the search key's hash are used as the key to the table, and then we do a linear scan over the bucket it points to.

When a hash table performs **insertion**, the insertion key is hashed, and then the table is used to determine the bucket that our new tuple should be in. The last $d$ bits of the hash is used as the key to the hash table, after which we add the new tuple to the end of the bucket.

### Splitting

When a value is inserted into a hash table, one of two things can happen: either the bucket doesn't overflow, or the bucket does overflow. If it overflows, then we need to **split** our bucket. To split a bucket, we create a new bucket with the same search key as the bucket that overflowed, but with a "1" prepended to it. We then prepend a "0" to the original bucket's search key. As an example, if a bucket with a local depth of 3 and search key "101" splits, we would be left with two buckets, each of local depth 4 and with search keys "0101" and "1101". Then, we transfer values matching the new search key from the old bucket to the new bucket, and we are done.

*It's worth noting that while we talk about "prepending" as if we are dealing with strings, in actuality, this action is done entirely through the bit-level representation of integers. Think about what you would have to add to a search key to effectively prepend its bit representation with a 1 or a 0. Hint: it has something to do with powers of 2.*

However, if a bucket overflows and ends up with a local depth greater than the global depth, this is no good. We should always maintain a global depth equal to the maximum of the buckets' local depths. To remedy this, we double the size of the hash table by appending it to itself and increasing global depth by 1. Then, we can iterate through and make sure that the buckets are all being pointed to by the correct slots in the hash table.

It is possible that after a split, all of the values in the old bucket ended up in the same bucket, immediately triggering a second split. This can be caused either by a bad hash function (imagine a hash function that maps all inputs to the same output), or due to an *adversarial workload*. In your database, you should handle recursive splits; however, you should not worry about endless recursive splits (which would happen if all elements in a splitting bucket had exactly the same hash).

<!-- TODO: A worked example of insertions and splits -->

### Deletion and Fragmentation

When a hash table performs **deletion**, depending on your scheme, the other values may have to be moved over to fill the space it left. A good indexing scheme would use slotted pages to avoid this, but our setup doesn't readily accomodate this. Alternatively, we could populate a free list. There are many ways to handle deletion, since we don't have to maintain any sort order on the bucket level. In this assignment, you should shift over the remaining entries on the right one place left or move the last entry into the gap created by the deletion to ensure that there is no internal fragmenting in the bucket.
