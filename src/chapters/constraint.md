---
title: Constraints
---

Constraints are a way to ensure that certain properties hold in a relational database. You've already seen some examples of constraints: primary key constraints ensure non-nullity and uniqueness of an attribute, for example. However, a richer set of constraints can be defined and enforced over your database, giving you ease of mind. For example, we might like that other fields be non-null, unique, fit some domain. In this chapter, we'll explore a set of basic constraints that help us verify our data, as well as how one could write SQL to enforce these constraints.

## Integrity Constraints

We are primarily motivated to write constraints that verify the **integrity** of our data. In particular, there are four main kinds of integrity constraints: key constraints, attribute constraints, referential integrity constraints, and global constraints.

**Key constraints**, otherwise known as uniqueness constraints, ensure uniqueness over a set of attributes. One might write this constraint like:

```sql
CREATE TABLE ABC(
a INT,
b INT,
c INT,
PRIMARY KEY (a),
UNIQUE (b, c));
```

The `PRIMARY KEY` constraint ensures non-nullity and uniqueness, while the `UNIQUE` constraint ensures uniqueness. In the above example, two rows `(1, 2, 3), (1, 4, 5)` couldn't coexist, neither could two rows `(0, 2, 3), (1, 2, 3)`.

**Attribute constraints** ensure that values of a particular attribute fulfills some predicate. One could use this to enforce that an integer be positive or odd, or that a string start with a particular prefix. One might write this constraint like:

```sql
CREATE TABLE ABC(
a INT,
b INT,
c INT,
CHECK (c > 0));
```

**Referential integrity constraints** ensures that a particular attribute in one table references a primary key of another table. This ensures that no tuple is left "dangling" if their referential pair is deleted; indeed, this could lead to extra data not being cleaned out of the system. We've covered the `FOREIGN KEY <a> REFERENCES <b>` already.

**Global constraints** are constraints that should apply to the whole database. In particular, they are generally phrased as a query that, when run, should always produce true. For example:

```sql
CHECK (NOT EXISTS(
  SELECT * FROM customers AS c, jobs as j WHERE c.jid == j.id AND c.cost < 0
));
```

These are comparatively costly to run as they require an entire query to run every time a change is made to the database. However, they are incredibly powerful in ensuring integrity. 
