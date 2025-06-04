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

This approach is the most beginner friendly and yields well to less complex scenarios. It involves completely separating the data into one type per search config. It may result in the most code duplication. But if you don't have to pass the type into functions and can then just pass fields, then code may be re-used between types. Unfortunately function nesting and thus passing around the type is hard to avoid it.

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

This approach extracts common functionality into a shared core structure and each individual type of search exists at the top level:

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

**Benefits:**
- Limits field duplication due to shared core
- Limited boilerplate
- Does not need a "common" trait, since it exists at the type level

**Drawbacks:**
- Some field duplication between `KeywordSearch` and `HybridSearch`
- Accessing core fields requires going through the `core` field
- Limited flexibility for future fields only shared some types
- Separate typed functions may be needed for each, resulting in more duplication

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

**Benefits:**
- Limits field duplication due to single top level type
- Common fields easily accessible without indirection
- Single entry point for all search operations/functions

**Drawbacks:**
- Still duplicates fields between `KeywordConfig` and `HybridConfig`
- Pattern matching may result in more code duplication across branches

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

**Benefits:**

- Zero code duplication
- Easy field access
- Least boilerplate
- Most api flexibility

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

# Discussion

Approach 1 is often the go to and the simplest. If you can design your functions to take fields rather the single struct type, you can avoid most code duplication. Often in practice, this pure functional approach is not implemented and full types are passed around. This is partially because of the amount of api changes needed for adding a single variable and you'd likely still need an accompanying `Kind` type. Thus, this is often not the correct solution.

I never go for approach 2 or 3 (Single common type). Since I've learned the hard way I'm not omnipotent, thus I cannot predict how the api will change in the future. Implementations using these two approaches tends to become the most wonky as more types are introduced and fields overlap some types but not all. If you tend to prefer one of these choices, I highly recommend considering approach 5 instead. As this follows the same abstraction concept, except is much more flexible to change.

Approach 4 satisfies me the most conceptually. The concerns are well separated. Unfortunately in practice I've found as you pass around the enum the significant amount of branching inside functions results in a lot of boilerplate at the implementation level and I often need to write more closures/functions avoid duplication inside the branches. Often I end up even implementing common getter and setter fields to avoid some of this boilerplate. Though a macro could definitely reduce this.

Approach 5 on first glance is gross. But in practice I've found it to be the most manageable for current implementations and resilient to future change. There is minimal boilerplate/duplication and using the structure is straight forward field access. If you need to know the kind, you can easily match on it. If you can get over the one large data structure and unwraps, it can be surprisingly pleasant to work with. Though especially for newcomers to the code, if you cannot keep which exists for which kind in your head it can easily become unwieldly. Maybe not surprisingly this approach exists often in the wild as well.

Approach 6 has the benefit over approach 1 since there is no need to decompose the struct to avoid function calling duplication, instead you define function signatures to take the required traits or combinations. Though there is a substantial amount of boilerplate at the initial onset and possibly every time you declare a function definition, and boxing values/casting comes with it's own set of drawbacks and pains to work with. A well constructed macro may be able to reduce this boilerplate.

Now which approach do I usually use? Personally I reach usually reach for 5. It allows me to prototype the fastest and get something done. If I am considering the long term viability of a project and know other individuals will look and work on the code. I may reach for 3, which is more of a rustic way.