---
layout: post
title: "Patterns for Modeling Variant Data in Rust"
# subtitle: ""
date: 2025-06-04
categories: [technical]
tags: [rust]
# image:
#   path: /images/post-image.jpg
#   thumbnail: /images/post-image-thumb.jpg
#   caption: "Photo credit [Unsplash](https://unsplash.com/)"
author:
  name: "Dillon McMahon"
#   picture: "/images/your-avatar.jpg"
share: true
comments: false
---
# Patterns for Modeling Variant Data in Rust

When building complex systems in Rust, one of the fundamental challenges developers face is how to organize their data structures to maintain type safety, avoid code duplication, keep their API clean, and remain flexible to changes. This article explores six different approaches to data modeling using a search engine as our example, examining the trade-offs between each approach.

## The Problem: Modeling Complex Search Functionality

Consider a search engine that supports three types of searches: keyword search, semantic search, and hybrid search (mostly combining both). Each search type shares some common fields but also has its own specific requirements. As a monolith:

```rust
pub struct Search<'a> {
    // Common to all searches
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,

    // Required only for keyword search
    filter: Option<Filter<'a>>,

    // Required only for keyword and hybrid
    query: Option<String>,
    terms_matching_strategy: Option<TermsMatchingStrategy>,
    scoring_strategy: Option<ScoringStrategy>,

    // Optional only for keyword and hybrid
    locales: Option<Vec<Language>>,
    
    // Required only for semantic
    semantic: Option<Vec<u8>>,
    
    // Required only for hybrid
    semantic_ratio: Option<f32>,
}
```

This monolithic approach works but has obvious problems: fields that don't apply to certain search types are still present, making the API confusing and potentially error-prone. For the moment, ignoring how this type is configured (usually all at once or through a builder pattern), consider we just need to be able to execute a search, knowing that common fields require common configuration / execution paths. How should we model this data such that we avoid unnecessary code duplication and remain flexible to new search configurations, while maintaining a clean understandable api?

Side: It it worth highlighting that often code duplication is not in itself bad and often necessary. It should never be avoided just for the sake of avoiding duplicated code. Too much abstraction for this sake is often itself brittle. As a general rule, the more you duplicate code, the more contextually large your program becomes and you have to write, while the more abstraction you introduce, the more complex your code becomes. For changes related to foreseen feature additions, duplicate code often results in changing a larger surface area of your code and abstraction often results in changes being easier to implement. For changes related to unforeseen feature additions, duplicate code often results in changing a larger surface area of your code and abstraction often results in changes being harder to implement.

## Approach 1: Struct Per Type

This approach is the most beginner friendly and yields well to less complex scenarios. It involves completely separating the data into one type per search config.

```rust
pub struct KeywordSearch<'a> {
    query: String,
    filter: Filter<'a>,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
}

pub struct SemanticSearch {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    semantic: Vec<u8>,
}

pub struct HybridSearch {
    query: String,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}
```

This often the go to and the simplest. Although it may result in the most code duplication. But if functions can be designed to take fields rather the single struct type, most code duplication can be avoided. Unfortunately often in practice, this pure functional approach is not implemented and full types are passed around. This is partially because of the amount of api changes needed for adding a single variable, as well as, an accompanying `Kind` type is likely still needed to be passed around. Thus, this is often not the best solution.

**Benefits:**

- Maximum simplicity, each type is completely independent and self-contained
- Beginner friendly, easy to understand, no complex abstractions or indirection
- Direct field access, no pattern matching, trait bounds, or core indirection needed
- Independent evolution, each type can evolve without affecting others

**Drawbacks:**

- Maximum code duplication, common fields and logic repeated across all types
- Maintenance burden, changes to common functionality require updating multiple places
- No shared interface, cannot write generic functions that work across search types

## Approach 2: Composition With Separate Types and A Shared Core

This is a common approach in the wild. it extracts common functionality into a shared core with each individual type of search type existing at the top level:

```rust
// Common fields used by all search types
pub struct SearchCore {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
}

pub struct KeywordSearch<'a> {
    core: SearchCore,
    query: String,
    filter: Filter<'a>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
}

pub struct SemanticSearch {
    core: SearchCore,
    semantic: Vec<u8>,
}

pub struct HybridSearch {
    core: SearchCore,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}
```

One could take this a step further an extract more fields into different cores. e.g.

```rust
// Common fields used by all search types
pub struct SearchCore {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
}

// Common fields used by keyword search types
struct KeywordCore<'a> {
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    query: String,
}

// Common fields used by semantic search types
struct SemanticCore {
    semantic: Vec<u8>,
}

pub struct KeywordSearch<'a> {
    core: SearchCore,
    filter: Filter<'a>,
    keyword: KeywordCore<'a>,
}

pub struct SemanticSearch {
    core: SearchCore,
    semantic: SemanticCore,
}

pub struct HybridSearch {
    core: SearchCore,
    keyword: KeywordCore,
    semantic: SemanticCore,
    semantic_ratio: f32,
}
```

But this should be done with caution and not just the sake of removing duplicate field declaration. since there is now additional field indirection and the using such code likely become more brittle to change as new types and fields are added. The focus should be on the use case. Will such core indirection allow us to re-use code? The answer depends on the domain, but likely less so then one might imagine at the onset.

**A Critical Limitation:**
While this approach initially appears clean, it tends to become problematic as APIs evolve. Programmers cannot predict how the API will change in the future, and this approach becomes particularly unwieldy when new search types are introduced that share fields with some existing types but not others. The rigid core structure makes it difficult to accommodate these partial overlaps without creating awkward intermediate types or duplicating fields anyway.

**Benefits:**
- Limits field duplication due to shared cores
- Limited boilerplate
- Does not need a "common" trait, since it exists at the type level

**Drawbacks:**
- Some field duplication between `KeywordSearch` and `HybridSearch`
- Accessing core fields requires going through "core" fields
- Limited flexibility for future fields only shared some types
- Separate typed functions may be needed for each, resulting in more duplication
-Becomes brittle as the API evolves - difficult to accommodate new types with partial field overlaps

## Approach 3: Composition With A Single Type and Different Variants

This approach is very similar to the previous theoretically, except it uses a single top level type and keeps common fields at the top level and uses an enum for type-specific configuration:

```rust
pub struct KeywordConfig<'a> {
    query: String,
    filter: Filter<'a>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
}

pub struct SemanticConfig {
    semantic: Vec<u8>,
}

pub struct HybridConfig {
    query: String,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}

pub enum SearchType<'a> {
    Keyword(KeywordConfig),
    Semantic(SemanticConfig<'a>),
    Hybrid(HybridConfig),
}

pub struct Search<'a> {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    search_type: SearchType<'a>,
}
```

Like the previous approach, it is also possible to take this a step further and extract more fields into different common types. But it should be considered first if the use case api's would benefit from such an abstraction.

**The Same Fundamental Problem:**
This approach suffers from the same core issue as Approach 2. The separation of common fields from variant-specific fields creates a rigid structure that becomes difficult to maintain as the API evolves. When new search types are introduced that need some but not all of the fields from existing configurations, you're forced into awkward choices: duplicate fields in the new config, create intermediate shared types, or restructure the entire hierarchy.

**Benefits:**
- Limits field duplication due to single top level type
- Common fields easily accessible without indirection
- Single entry point for all search operations/functions

**Drawbacks:**
- Still duplicates fields between `KeywordConfig` and `HybridConfig`
- Pattern matching may result in more code duplication across branches
- Rigid separation becomes problematic - difficult to accommodate new types with different field combinations which often requires restructuring when the API evolves

## Approach 4: Enum as Top Level with Complete Structs

This approach puts the enum at the top level, with each variant containing a complete struct:

```rust
pub struct KeywordSearch<'a> {
    query: String,
    filter: Filter<'a>,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
}

pub struct SemanticSearch {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    semantic: Vec<u8>,
}

pub struct HybridSearch {
    query: String,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}

pub enum Search<'a> {
    Keyword(KeywordSearch<'a>),
    Semantic(SemanticSearch),
    Hybrid(HybridSearch),
}
```

This approach is the most "rustic". It remains flexible to change while being type safe without and the concerns are well separated. Unfortunately in practice, as the enum is passed around, the significant amount of branching inside functions results in a lot of boilerplate at the implementation level. Often requiring more closures/functions to avoid duplication inside the branches. It is common to implement getter and setter fields to avoid some of this boilerplate. Though a macro could definitely reduce this.

**Benefits:**
- Clean enum interface at the top level
- Each search type is self-contained and complete
- More resilient than the previous two to future changes
- Easy to understand and reason about

**Drawbacks:**
- Significant field duplication across all structs
- May require the most duplicate code for handling common fields through delegating methods

## Approach 5: Monolith With Kind

This approach involves keeping the monolithic approach, but introducing a "kind" field. That identifies the type of search being done.

```rust
pub enum SearchKind {
    Keyword,
    Semantic,
    Hybrid,
}

// Our original monolithic struct
pub struct Search<'a> {
    query: Option<String>,
    filter: Option<Filter<'a>>,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
    kind: SearchKind
}
```

On first glance this may feel like the wrong solution. But in practice, this may be the most manageable and resilient to future change. There is minimal boilerplate/duplication and using the structure is straight forward field access. To know the kind, one can easily match on it. If you can get over the one large data structure and unwraps, it can be surprisingly pleasant to work with as little thought is needed to api structure and no refactoring is usually needed when adding fields. This structure is ideal for rapid development and prototyping. Though as more and more fields are added, especially for newcomers to the code, it becomes harder to keep which exists for which kind in your head. Thus it can easily become unwieldly. Maybe not surprisingly this approach exists often in the wild as well.

**Benefits:**

- Zero code duplication
- Easy field access
- Least boilerplate
- Most api flexibility
- Pairs naturally with the builder pattern

**Drawbacks:**
- Largest compile time size
- Requires runtime type checking on `kind` with a subsequent `unwrap`
- API confusion, Unclear which fields apply to which search types
- Requires comments which may become outdated to maintain which states are possible for each `kind`
- Easy to create logically inconsistent combinations

## Approach 6: Trait-Based Composition

This approach does not rely on the structure of the backing data, but instead relies on the ability to get the backing data through traits. Traits are provided for individual fields when you need to reuse functions. For the sake of example, the structure of the backing data is the same as approach 1. 

```rust
// Concrete struct implementations
pub struct KeywordSearch<'a> {
    query: String,
    filter: Filter<'a>,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
}

pub struct SemanticSearch {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    semantic: Vec<u8>,
}

pub struct HybridSearch {
    query: String,
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}

// Individual field traits
pub trait HasQuery {
    fn get_query(&self) -> &String;
    fn set_query(&mut self, query: String);
}

pub trait HasFilter<'a> {
    fn get_filter(&self) -> &Filter<'a>;
    fn set_filter(&mut self, filter: Filter<'a>);
}

pub trait HasOffset {
    fn get_offset(&self) -> usize;
    fn set_offset(&mut self, offset: usize);
}

pub trait HasLimit {
    fn get_limit(&self) -> usize;
    fn set_limit(&mut self, limit: usize);
}

pub trait HasTimeBudget {
    fn get_time_budget(&self) -> &TimeBudget;
    fn set_time_budget(&mut self, time_budget: TimeBudget);
}

pub trait CanHaveRankingScoreThreshold {
    fn get_ranking_score_threshold(&self) -> Option<&f64>;
    fn set_ranking_score_threshold(&mut self, threshold: Option<f64>);
}

pub trait HasTermsMatchingStrategy {
    fn get_terms_matching_strategy(&self) -> &TermsMatchingStrategy;
    fn set_terms_matching_strategy(&mut self, strategy: TermsMatchingStrategy);
}

pub trait HasScoringStrategy {
    fn get_scoring_strategy(&self) -> &ScoringStrategy;
    fn set_scoring_strategy(&mut self, strategy: ScoringStrategy);
}

pub trait CanHaveLocales {
    fn get_locales(&self) -> Option<&Vec<Language>>;
    fn set_locales(&mut self, locales: Option<Vec<Language>>);
}

pub trait HasSemantic {
    fn get_semantic(&self) -> &Vec<u8>;
    fn set_semantic(&mut self, semantic: Vec<u8>);
}

pub trait HasSemanticRatio {
    fn get_semantic_ratio(&self) -> f32;
    fn set_semantic_ratio(&mut self, ratio: f32);
}

// Trait implementations for KeywordSearch
impl HasQuery for KeywordSearch<'_> {
    fn get_query(&self) -> &String {
        &self.query
    }
    
    fn set_query(&mut self, query: String) {
        self.query = query;
    }
}

impl<'a> HasFilter<'a> for KeywordSearch<'a> {
    fn get_filter(&self) -> &Filter<'a> {
        &self.filter
    }
    
    fn set_filter(&mut self, filter: Filter<'a>) {
        self.filter = filter;
    }
}

impl HasOffset for KeywordSearch<'_> {
    fn get_offset(&self) -> usize {
        self.offset
    }
    
    fn set_offset(&mut self, offset: usize) {
        self.offset = offset;
    }
}

impl HasLimit for KeywordSearch<'_> {
    fn get_limit(&self) -> usize {
        self.limit
    }
    
    fn set_limit(&mut self, limit: usize) {
        self.limit = limit;
    }
}

impl HasTimeBudget for KeywordSearch<'_> {
    fn get_time_budget(&self) -> &TimeBudget {
        &self.time_budget
    }
    
    fn set_time_budget(&mut self, time_budget: TimeBudget) {
        self.time_budget = time_budget;
    }
}

impl CanHaveRankingScoreThreshold for KeywordSearch<'_> {
    fn get_ranking_score_threshold(&self) -> Option<&f64> {
        self.ranking_score_threshold.as_ref()
    }
    
    fn set_ranking_score_threshold(&mut self, threshold: Option<f64>) {
        self.ranking_score_threshold = threshold;
    }
}

impl HasTermsMatchingStrategy for KeywordSearch<'_> {
    fn get_terms_matching_strategy(&self) -> &TermsMatchingStrategy {
        &self.terms_matching_strategy
    }
    
    fn set_terms_matching_strategy(&mut self, strategy: TermsMatchingStrategy) {
        self.terms_matching_strategy = strategy;
    }
}

impl HasScoringStrategy for KeywordSearch<'_> {
    fn get_scoring_strategy(&self) -> &ScoringStrategy {
        &self.scoring_strategy
    }
    
    fn set_scoring_strategy(&mut self, strategy: ScoringStrategy) {
        self.scoring_strategy = strategy;
    }
}

impl CanHaveLocales for KeywordSearch<'_> {
    fn get_locales(&self) -> Option<&Vec<Language>> {
        self.locales.as_ref()
    }
    
    fn set_locales(&mut self, locales: Option<Vec<Language>>) {
        self.locales = locales;
    }
}


// Trait implementations for SemanticSearch
impl HasOffset for SemanticSearch {
    fn get_offset(&self) -> usize {
        self.offset
    }
    
    fn set_offset(&mut self, offset: usize) {
        self.offset = offset;
    }
}

impl HasLimit for SemanticSearch {
    fn get_limit(&self) -> usize {
        self.limit
    }
    
    fn set_limit(&mut self, limit: usize) {
        self.limit = limit;
    }
}

impl HasTimeBudget for SemanticSearch {
    fn get_time_budget(&self) -> &TimeBudget {
        &self.time_budget
    }
    
    fn set_time_budget(&mut self, time_budget: TimeBudget) {
        self.time_budget = time_budget;
    }
}

impl CanHaveRankingScoreThreshold for SemanticSearch {
    fn get_ranking_score_threshold(&self) -> Option<&f64> {
        self.ranking_score_threshold.as_ref()
    }
    
    fn set_ranking_score_threshold(&mut self, threshold: Option<f64>) {
        self.ranking_score_threshold = threshold;
    }
}

impl HasSemantic for SemanticSearch {
    fn get_semantic(&self) -> &Vec<u8> {
        &self.semantic
    }
    
    fn set_semantic(&mut self, semantic: Vec<u8>) {
        self.semantic = semantic;
    }
}


// Trait implementations for HybridSearch
impl HasQuery for HybridSearch {
    fn get_query(&self) -> &String {
        &self.query
    }
    
    fn set_query(&mut self, query: String) {
        self.query = query;
    }
}

impl HasOffset for HybridSearch {
    fn get_offset(&self) -> usize {
        self.offset
    }
    
    fn set_offset(&mut self, offset: usize) {
        self.offset = offset;
    }
}

impl HasLimit for HybridSearch {
    fn get_limit(&self) -> usize {
        self.limit
    }
    
    fn set_limit(&mut self, limit: usize) {
        self.limit = limit;
    }
}

impl HasTimeBudget for HybridSearch {
    fn get_time_budget(&self) -> &TimeBudget {
        &self.time_budget
    }
    
    fn set_time_budget(&mut self, time_budget: TimeBudget) {
        self.time_budget = time_budget;
    }
}

impl CanHaveRankingScoreThreshold for HybridSearch {
    fn get_ranking_score_threshold(&self) -> Option<&f64> {
        self.ranking_score_threshold.as_ref()
    }
    
    fn set_ranking_score_threshold(&mut self, threshold: Option<f64>) {
        self.ranking_score_threshold = threshold;
    }
}

impl HasTermsMatchingStrategy for HybridSearch {
    fn get_terms_matching_strategy(&self) -> &TermsMatchingStrategy {
        &self.terms_matching_strategy
    }
    
    fn set_terms_matching_strategy(&mut self, strategy: TermsMatchingStrategy) {
        self.terms_matching_strategy = strategy;
    }
}

impl HasScoringStrategy for HybridSearch {
    fn get_scoring_strategy(&self) -> &ScoringStrategy {
        &self.scoring_strategy
    }
    
    fn set_scoring_strategy(&mut self, strategy: ScoringStrategy) {
        self.scoring_strategy = strategy;
    }
}

impl CanHaveLocales for HybridSearch {
    fn get_locales(&self) -> Option<&Vec<Language>> {
        self.locales.as_ref()
    }
    
    fn set_locales(&mut self, locales: Option<Vec<Language>>) {
        self.locales = locales;
    }
}

impl HasSemantic for HybridSearch {
    fn get_semantic(&self) -> &Vec<u8> {
        &self.semantic
    }
    
    fn set_semantic(&mut self, semantic: Vec<u8>) {
        self.semantic = semantic;
    }
}

impl HasSemanticRatio for HybridSearch {
    fn get_semantic_ratio(&self) -> f32 {
        self.semantic_ratio
    }
    
    fn set_semantic_ratio(&mut self, ratio: f32) {
        self.semantic_ratio = ratio;
    }
}
```

Approach 6 has the benefit over approach 1 since there is no need to decompose the struct to avoid function calling duplication, instead you define function signatures to take the required traits or combinations. Though there is a substantial amount of boilerplate at the initial onset and possibly every time you declare a function definition, and boxing values/casting comes with it's own set of drawbacks and pains to work with. A well constructed macro may be able to reduce this boilerplate.

**Benefits:**
- Maximum flexibility - can mix and match traits as needed for method implementations
- No field duplication in the trait definitions
- Easy to add new combinations of functionality
- Can implement the same trait for different backing data structures
- Allows runtime type checking/casting deep in function calls

**Drawbacks:**
- Significant boilerplate for trait definitions
- Still need to decide on backing data structures (usually struct per search type see next section)
- Runtime type checking/casting may still be needed deep in function calls
- Can become complex to understand and maintain - trait bounds can become unwieldy

## Which Approach Is Best

There's no one-size-fits-all solution to data modeling in Rust. The choice depends on your specific requirements around type safety, flexibility, maintenance burden, and API design. Consider your domain's stability, the frequency of changes, and the complexity you're willing to accept in your codebase.