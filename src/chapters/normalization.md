---
title: Normalization
---

Schema design is difficult; however, one of the perks of the relational model is that, by virtue of being rather mathematical in nature, we have a large body of knowledge to draw from in their construction. Normalization is one way to guide schema design; indeed, if we can ensure that our schemas fulfill some properties, then we can benefit from the guarantees that are provided by these **normal forms**. In this chapter we'll explore normalization through the lens of schema design and see the benefits and drawbacks of adhering to a normal form.

## Functional Dependencies

In order to discuss normalization, we must discuss the nature of our data. In particular, we want to know how our data interact with each other, and we do this by discussing **functional dependencies**. Functional dependencies describe how different attributes relate to other attributes. Formally, an attribute $A$ is _functionally determined by_ $B$ (equivalently, $B$ determines $A$) if tuples with the same value for $B$ always have the same value for $A$. We write this as $B \to A$. We can write dependencies over any non-empty set of attributes; say $A_1, A_2, \ldots, A_s \to B_1, B_2, \ldots, B_t$.

Typically, there is a little leeway in discussing what functional dependencies exist. Indeed, although we may have that every customer named "Ronnie" also shops at the "Irvine" location, it doesn't necessarily imply that all future Ronnies must also shop in Irvine. We cannot necessarily determine that a dependency exists by looking at populated databases. Thus, we must determine our dependencies by analyzing the nature of our data somewhat philosophically, then moving forward.

We have quite a few sub-definitions surrounding functional dependencies. We say that if $Y \subseteq X$, then $X \to Y$ is a **trivial dependency** and should be removed. Indeed, of course if two tuples share all of their attributes in $X$, then they will share all of their attributes in a subset of $X$.

Consider an attribute set $A$. We say that if $X$ determines $A \setminus X$, then $X$ is a **super key**. Of course, $A$ itself is a super key. If there is no $Y \subset X$ such that $Y$ determines $A \setminus X$, then $X$ is a **candidate key**. We can safely choose any candidate key as a **primary key**; however, some might be more natural than others.

### Armstrong's Axioms

It turns out that given a set of constraints, there might be a better way to write them. There are three fundamental axioms that govern rewriting functional dependencies:

1. Reflexivity: $Y \subseteq X \implies X \to Y$
2. Augmentation: $X \to Y \implies WX \to WY$
3. Transitivity: $X \to Y \wedge Y \to Z \implies X \to Z$

From these rules, we can prove three more useful rules (as an exercise, try proving them):

4. Union: $X \to Y \wedge X \to Z \implies X \to YZ$
5. Decomposition: $X \to YZ \implies X \to Y \wedge X \to Z$
6. Pseudotransitivity: $X \to Y \wedge WY \to Z \implies WX \to Z$

Using these rules, we can rewrite our functional dependencies to nicer to work with forms. In particular, finding a minimal functional dependency set is somewhat easy using the **Canonical Cover Algorithm**.

<!-- TODO: CCA -->

## Normal Forms

It is often incredibly helpful to put our tables into a **normal form**. A normal form is a set of properties that, if our tables hold, certain nice properties also hold. If nothing else, they serve as a good guideline for schema design. We will explore the canonical normal forms, original proposed by Codd, in increasing restrictivity using an example.

Consider the following schema and data:

```
course (c_id, dept_id, dept, evaluations, inst, office, sect, time_slot)
```

| c_id | dept_id | dept | evaluations        | inst           | office | sect | time_slot |
| ---- | ------- | ---- | ------------------ | -------------- | ------ | ---- | --------- |
| 61   | 1       | CS   | HW, Midterm, Final | Eddie Kohler   | 345    | A    | 8am-10am  |
| 61   | 1       | CS   | HW, Midterm, Final | Eddie Kohler   | 345    | B    | 1pm-3pm   |
| 165  | 2       | MATH | Project, Final     | Stratos Idreos | 346    | A    | 10am-11am |
| 165  | 2       | MATH | Project, Final     | Stratos Idreos | 346    | B    | 7pm-8pm   |
| 265  | 2       | MATH | HW                 | Andy Pavlo     | 346    | B    | 1pm-2pm   |
| 455  | 3       | PHYS | Midterm, Final     | Nesime Tatbul  | 347    | B    | 6pm-7pm   |

## First Normal Form

A schema is in the first normal form when:
- The attributes are atomic, and
- The attribute names are unique.

We already have the latter, so we'll focus on the former. To ensure atomicity, we split `time_slot` into two attributes `time_start` and `time_end`, and pull evaluations out into an `evaluation` table, as well as a `course_evaluation` table to join evaluations back to courses.

```
course (**c_id**, **sect**, dept_id, dept, inst, office, time_start, time_end)
evaluation (**e_id**, e_name)
course_evaluation (**c_id**, **e_id**)
```

Here is the resulting data for this decomposition:

| c_id | sect | dept_id | dept  | inst           | office | time_start | time_end |
| ---- | ---- | ------- | ----  | -------------- | ------ | ---------- | -------- |
| 61   | A    | 1       | CS    | Eddie Kohler   | 345    | 8am        | 10am     |
| 61   | B    | 1       | CS    | Eddie Kohler   | 345    | 1pm        | 3pm      |
| 165  | A    | 2       | MATH  | Stratos Idreos | 346    | 10am       | 11am     |
| 165  | B    | 2       | MATH  | Stratos Idreos | 346    | 7pm        | 8pm      |
| 265  | B    | 2       | MATH  | Andy Pavlo     | 346    | 1pm        | 2pm      |
| 455  | B    | 3       | PHYS  | Nesime Tatbul  | 347    | 6pm        | 7pm      |

| e_id | e_name |
| ---- | ------ |
| 1    | HW     |
| 2    | Project|
| 3    | Midterm|
| 4    | Final  |

| c_id | e_id |
| ---- | ---- |
| 61   | 1    |
| 61   | 3    |
| 61   | 4    |
| 165  | 2    |
| 165  | 4    |
| 265  | 1    |
| 455  | 3    |
| 455  | 4    |

## Second Normal Form

A schema is in the second normal form when:
- The schema is in first normal form (done!)
- There are no partial dependencies.

What is a partial dependency? Say there's a candidate key $A$. Then, every other attribute in the relation should depend on all of $A$, not a subset of it. If there is an attribute such that only a part of $A$ functionally determines it, there is a partial dependency.

Let's lay out our dependencies:

```
c_id -> dept_id, inst
c_id, sect -> time_start, time_end
inst -> office, c_id
dept_id -> dept
```

Notice that in the first table above, `c_id -> dept_id, inst` is a partial dependency, as the LHS is a subset of the candidate key `c_id, sect`. Thus, we should split `c_id, sect, time_start, time_end` into its own table:

```
course (**c_id**, dept_id, dept, inst, office)
section (**c_id**, **sect**, time_start, time_end)
evaluation (**e_id**, e_name)
course_evaluation (**c_id**, **e_id**)
```

Here is the resulting data for this decomposition:

| c_id | dept_id | dept  | inst           | office |
| ---- | ------- | ----  | -------------- | ------ |
| 61   | 1       | CS    | Eddie Kohler   | 345    |
| 165  | 2       | MATH  | Stratos Idreos | 346    |
| 265  | 2       | MATH  | Andy Pavlo     | 346    |
| 455  | 3       | PHYS  | Nesime Tatbul  | 347    |

| c_id | sect | time_start | time_end |
| ---- | ---- | ---------- | -------- |
| 61   | A    | 8am        | 10am     |
| 61   | B    | 1pm        | 3pm      |
| 165  | A    | 10am       | 11am     |
| 165  | B    | 7pm        | 8pm      |
| 265  | B    | 1pm        | 2pm      |
| 455  | B    | 6pm        | 7pm      |

| e_id | e_name |
| ---- | ------ |
| 1    | HW     |
| 2    | Project|
| 3    | Midterm|
| 4    | Final  |

| c_id | e_id |
| ---- | ---- |
| 61   | 1    |
| 61   | 3    |
| 61   | 4    |
| 165  | 2    |
| 165  | 4    |
| 265  | 1    |
| 455  | 3    |
| 455  | 4    |

## Third Normal Form

A schema is in the third normal form when:
- The schema is in second normal form (done!)
- There are no transitive dependencies.

A transitive dependency is a dependency between two sets of attributes where both sets are still dependent on the primary key. Formally, if $A \to B$ and $B \to C$ and NOT $B \to A$ , then $A \to C$ is a transitive dependency. Once you've identified a transitive dependency, you can separate the dependent attributes out into another relation.

Let's lay out our dependencies from last time, even though they are unchanged:

```
c_id -> dept_id, inst
c_id, sect -> time_start, time_end
inst -> office, c_id
dept_id -> dept
```

Notice that we have a transitive dependency in `c_id -> dept_id` and `dept_id -> dept` and NOT `dept_id -> c_id`. So, we pull `dept_id, dept` into its own table.

```
course (**c_id**, dept_id, inst, office)
section (**c_id**, **sect**, time_start, time_end)
evaluation (**e_id**, e_name)
course_evaluation (**c_id**, **e_id**)
department(**dept_id**, dept)
```

Here is the resulting data for this decomposition:

| c_id | dept_id | inst           | office |
| ---- | ------- | -------------- | ------ |
| 61   | 1       | Eddie Kohler   | 345    |
| 165  | 2       | Stratos Idreos | 346    |
| 265  | 2       | Andy Pavlo     | 346    |
| 455  | 3       | Nesime Tatbul  | 347    |

| c_id | sect | time_start | time_end |
| ---- | ---- | ---------- | -------- |
| 61   | A    | 8am        | 10am     |
| 61   | B    | 1pm        | 3pm      |
| 165  | A    | 10am       | 11am     |
| 165  | B    | 7pm        | 8pm      |
| 265  | B    | 1pm        | 2pm      |
| 455  | B    | 6pm        | 7pm      |

| e_id | e_name |
| ---- | ------ |
| 1    | HW     |
| 2    | Project|
| 3    | Midterm|
| 4    | Final  |

| c_id | e_id |
| ---- | ---- |
| 61   | 1    |
| 61   | 3    |
| 61   | 4    |
| 165  | 2    |
| 165  | 4    |
| 265  | 1    |
| 455  | 3    |
| 455  | 4    |

| dept_id | dept  |
| ------- | ----  |
| 1       | CS    |
| 2       | MATH  |
| 3       | PHYS  |

## BCNF (Third-and-a-half Normal Form)

A schema is in BCNF when:
- The schema is in third normal form (done!)
- For all dependencies, either:
    - $a \to b$ is a trivial dependency ( $a \subseteq b$ ), or
    - $a$ is a superkey.

As an exercise, convert this schema into BCNF. You should have six relations by the end of your conversion.
