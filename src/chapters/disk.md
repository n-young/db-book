---
title: Disk
---

## Disk



## Pages

Given a set of records, we have many potential strategies of storing them in a file. One strategy is called a heap file, where the database is represented as a single, unorganized file, and records are inserted wherever there is space for it. However, heap files are not particularly organized. As you insert and delete data, especially if the data is not fixed-size, fragmentation in your file will lead to wasted space.

Although we like to think of data in terms of bits and bytes, our disk and operating system handle data in units of pages. Formally, a **page** is the smallest amount of data that can be guaranteed to be written to disk in a single atomic operation, traditionally fixed at a uniform size, such as 4096 bytes. In other words, our operating system exclusively read from and write to disk in blocks of 4096 bytes. We can leverage this feature of our operating system to create a more organized and flexible storage scheme.

> It's worth noting that these days, multiple page sizes are supported on various architectures. Additionally, database systems are free to set their own page sizes to multiples of the underlying system's page size. However, these design choices come with various tradeoffs.

TODO: Different kinds of disks, sequential reads, random reads, TTL, SSDs, persistent memory

### Disk Manager

To store a database on disk, we can either write directly to block devices, or have the operating system do this for us. The former is a pain to implement and port to other hardware platforms. Instead, we will do the latter. Since the operating system doesn't know anything about our data model, database files are treated just like normal files, meaning that all the regular read and write operations are available for us to use.

In BumbleBase, each table is stored as a separate file. To read a specific section of the table, we have to seek to the appropriate byte offset within the file, then read in the specified number of bytes. To minimize the number of blocks we read from disk, *the byte offset should be page-aligned (i.e. a multiple of the page size)*. We should read in one page's worth of data at a time. When writing to our database, we do the same thing: seek to the correct byte offset in the file, then write a page's worth of bytes to the file.

Here's an example to illustrate: consider a particular tuple, A, which exists in page P. To select A, we first read in the entire page P, and then search P for A. It might seem wasteful to read in so much extra data if we only need one tuple, but as we'll see soon, doing this makes it easier to cache data that we've read in predictable and reusable chunks and leverages the operating system's underlying construction for speed.

This functionality is provided for you. However, it's good to have a firm grasp of how we're writing data to and from pages.

### Buffer Cache & Page Table

It would be wasteful to read a page into memory and immediately write it out; if we've already gone through the trouble of reading a page in, we should keep it around in case it is needed again in the near future. After all, some pages are often read very often, or might be read multiple times in a particular transaction. This process is called **caching**.

The cached data will be stored in a buffer that we first pre-allocate, then fill. Critically, the buffer must be page aligned, such that the data stored in a page-sized block is actually stored as a single page, and not sharded across two. The buffer is represented as a series of **frames**, each large enough to hold one page. When a page is brought into memory, it will reside in a frame.

To keep track of which pages are in which frames, we have a **page table**. A page table is a map from page ids to frame ids, and indicates where pages are currently being stored in memory.

Let's consider an example. In the following diagram, our program has requested pages 0, 1, 2, and 3. To the external program, it seems as through these pages physically exist in order - this is known as the "logical memory" abstraction. The pages *actually* live in one of 8 frames that we've allocated. To figure out which frame each page lives in, we consult the page table, which maps the page ids to the frame its stored in.

![page table](/static/posts/project/pager/page_table.jpeg)

### Pinning Pages

While a page is in use, we want to make sure that it doesn't get evicted from the cache. Pinning a page marks it as in use and prevents it from being evicted. Pinning is usually implemented as a thread-safe counter of the number of threads currently using the page. This is what we do as well (see the `pinCount` attribute).

As an example, let's say we request a new page from the pager. Since this is a new page, we know that we're the only person using it, so we set the pin count to 1. Once we're finished, we decrement the pin count. If nobody else had taken the page in the meantime, we would be clear to free the page since the pin count would be 0. However, if someone else *did* take the page in the meantime, then the reference count would be greater than 0, meaning we cannot free the page.

### Getting and Evicting Pages

Whenever we get a page that is not already in our page table, we want to grab it from disk and keep track of it in our page table. Initially, all of our empty frames are stored in a **free list**; while this free list is non-empty, we should be using one of our free frames to store new pages. However, once all of our frames are full, we should evict old pages from memory and use those newly freed frames to store our new pages.

In addition to the free list, we also keep track of a **pinned list** and an **unpinned list**. While a page is in use, it should be in the pinned list, and while it is not in use, it should be in the unpinned list. Critically, when a page shifts from being in use to not being in use (*i.e.* the pin count drops to 0), it should be removed from the pinned list and inserted into the end of the unpinned list. Symettrically, when a page shifts from being not in use to being in use (*i.e.* the pin count increases to 1 from 0), it should be removed from the unpinned list and inserted into the end of the pinned list. A page should never move to the free list (think about why). Make sure you're able to wrap your head around what these three lists are used for!

![pager](/static/posts/project/pager/pager.png)

When a new page is requested and the free list is full, we need to evict an old page to create space. Notice that the first page in the unpinned list is most likely the best candidate to evict; it is not currently in use, and since we add new unpinned pages to the end of the unpinned list, it is the oldest such page. We have actually implemented what is known as a **least recently used cache**, or an **LRU cache**. This is one of many possible caching strategies we could have used, but is simple and effective for most use cases. Thus, we evict this page and use that frame for our new page!

It's possible to have multiple pagers operating on the same allocated disk space. In the following example, each process thinks it has its own memory space when accessing the pages of a file. However, under the hood, the same amount of physical memory is still being used, but it is done in a way that is opaque to the user.

![page tables](/static/posts/project/pager/page_tables.png)

### Dirty Pages

While data persistence is good, reading from and writing to the disk are expensive operations. In order to minimize the amount of writes, we avoid writing data to the disk unless something has changed. Concretely, if a user only performs SELECTs, but does not INSERT, DELETE, or UPDATE entries on a particular page, then there is no need to flush the page to disk, since the page hasn't changed.

*A page is considered **dirty** when it has been modified, and all dirty pages must be written out to disk before being evicted from the cache.* This guarantees that we persist all changes we make to the database.

![lists](/static/posts/project/pager/lists.png)
