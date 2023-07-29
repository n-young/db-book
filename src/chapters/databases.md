---
title: Databases
---

Welcome to the wonderful world of databases! My goal in writing this is to demystify how exactly the largest and smallest companies store and process data from first principles. Throughout these articles, you'll learn about the techniques that have shaped most modern databases, and even potentially be able to build one yourself.

At its core, a database needs to fulfill two goals: data storage and data retrieval. Databases must be built to store obscene amounts of data, as well as scale as your business needs grow. They must store data quickly and reliably, such that data is never lost or corrupted. They must also be able to answer arbitrarily complex questions about that data in a timely fashion, as well as support multiple users at a time. While this might seem like a rather simple task given modern abstractions like, say, an operating system, it is indeed not a trivial endeavour.

## Why do we need Databases?

To see why it is indeed nontrivial, let's consider some strawman examples of databases. Let's say you're a cat cafe business storing medical information about all of your cats over time. Incredibly naively, let's say you write down all of your medical information in a `.txt` document, like so:

```
snuffles temperate 30C 07/31/2001
kingpin temperature 31C 07/31/2001
snuffles temperature 31C 07/32/2001
kingpin temperature 31C 08/01/2001
```

Maybe you can tease out a few obvious reasons why this isn't great. Firstly, we have no structure over the data, so creating programs to work with this data is costly and tedious. Secondly, we have no data validation or types, so we're allowed to have invalid or meaningless datapoints like `07/32/2001`. Perhaps less obviously, since we are using a file abstraction, multiple tenants couldn't read and write in real-time without worrying about overwriting someone else's information, and we can't work with any information without reading the entire file in. And so on.

Let's do a little better and store our data in a `.csv` file, where the first entry is the cat's name, the second the cat's temperature in celsius, and the third the date:

```
snuffles, 30, 07/31/2001
kingpin, 31, 07/31/2001
snuffles, 31, 07/32/2001
kingpin, 31, 08/01/2001
```

This is better, but we still have more to do. For example, nothing in the `.csv` file inherently stops us from deciding to break our schema. Data validation is still not present. And moreover, we still have no way to answer questions about our data without writing a new program to do it.

Now, let's put our data into a database. For this toy example, we'll use the smallest and most popular database in the world: sqlite3. After installing and setting up a sqlite file, we type in some commands that look like the following:

```sqlite3
CREATE TABLE cats (
  name VARCHAR(255),
  temperature INT,
  date DATE
);
INSERT INTO cats VALUES ("snuffles", 30, 07/31/2001);
INSERT INTO cats VALUES ("kingpin", 31, 07/31/2001);
INSERT INTO cats VALUES ("snuffles", 31, 07/32/2001); // should error
INSERT INTO cats VALUES ("kingpin", 31, 08/01/2001);
```

And our data is now stored! This might seem like a lot more work, but our database is validating that our data is of the correct shape, it's taking care of the format that our data takes on disk, and more advanced databases will even support other users adding and reading data at the same time. Most importantly, we can now answer questions about our data without writing ad-hoc programs!

```sqlite3
SELECT name FROM cats WHERE temperature >= 31;
// Should print out kingpin, snuffles, kingpin
```

Aside from this contrived example, databases provide a suite of incredibly powerful functionality, some of which we'll get to explore.

## Components of a Databases

Now that you've seen _why_ we should build a database, we should get into the broad strokes of _how_ a databases is built. This section serves doubly as a roadmap for the rest of the webbook, as we will tackle these components in the order that they are presented.

Any good program has an interface, and for databases, this interface takes the form of a **Data Definition Language (DDL)** and **(Data) Query Language (QL)**. An incredibly popular DDL and Query Language is SQL, which stands for **Structured Query Language**. SQL gives users a way to communicate inserts, updates, deletes, and selections of data (among many other things) in a human-parsable way. However, it is far from the only language. Another tool called **Relational Algebra** allows us to express the same queries as SQL can in a more mathematical notation. Choosing and using a language as the database's interface has become the industry norm, and also gives us great insight into what customers are likely to request from a database.

A database is also useless without a storage engine, typically backed by both disk and memory. Disk refers to persistent, durable storage (e.g. hard drives, solid state drives, flash drives), while memory refers to transient, volatile storage (e.g. registers, RAM). Having a method to efficiently and reliably move data between these storage methods is necessary to have a fast and sturdy database.

To answer questions about the data, a database needs a query engine. This query engine is typically aided by a set of indexes which are built over the data, which provide quick and easy lookup and discovery of data to make answering queries faster. A query engine is typically separated into two components: a query optimizer and a query executor. A query optimizer takes in a query and rewrites it to be as easy to execute as possible, while a query executor takes an optimized plan and actually runs it. While the lines between these two components may blur, they together form the query engine.

On top of these components, the database may be outfitted with extra machinery to ensure that it works in a distributed or multi-tenant setting. We'll get to these concerns later.

## Different Needs, Different Databases

Looking at this from a different point of view (i.e. from a user's point of view), how should one choose which database to use? Perhaps a more salient question, then, is what makes databases different?

There is no true best database. Indeed, depending on what exactly your business is trying to do, one database which might be a superstar for your friends might be an absolute dud for you. Part of the reason why learning how to build a database is valuable is being able to understand the ecosystem from the ground up and make more informed choices as a user.

Traditionally, databases could be siloed off into two main categories of workloads: online transaction processing (OLTP) and online analytics processing (OLAP). OLTP workloads are all about processing quick and simple writes and reads efficiently and quickly, like a business that wants to log all of the payments that go through each store. OLAP workloads are all about answering ad-hoc queries about the data that has been collected over time, perhaps in another databases, like a search company trying to figure out which websites have been visited the most by certain customers. Somewhat clearly, these workloads have very different priorities, and indeed many databases are able to handle both of these workloads. However, when we push a database to its limits, it may no longer be able to handle one or both of these workloads; indeed, as data begins to pervade all facets of life, we need better and better databases to process quick transactions and complicated queries. One could spend a lot of time discussing the trade-offs between specific databases, but we'll leave further discussion for the end.

It's worth noting two special phenomena in the database world before closing. Firstly, databases that store much less structured data, called NoSQL databases, have taken the world by storm. Indeed, they are much easier to write and work with, and scale much better in the global setting (we will see why much later). However, with this ease of use and growth comes loss of structure, and many guarantees we got with traditional databases no longer apply. While it is a popular choice, it should not necessarily be the default.

Secondly, special purpose databases like time-series databases, graph databases, geospatial databases, and others have begun to crop up as well. These databases are often built to realize a very specific business need, such as signal monitoring, social networks, or car routing. While they are not very useful for the generic customer, they've found an audience.
