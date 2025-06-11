---
layout: post
title: "Solving Rust Data Modeling with View-Types: A Macro-Driven Approach"
# subtitle: ""
date: 2025-06-11
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

In the previous article, [Patterns for Modeling Variant Data in Rust](link-to-previous-article), six different approaches to modeling overlapping data structures were explored, each with their own trade-offs between type safety, code duplication, and API flexibility. Today, I want to introduce a solution that addresses many of these challenges: the `view-types` macro.

## Recap: The Challenge

When building complex systems, we often need to model data that has overlapping but not identical field requirements. In the search engine example, we had:

- **Keyword Search**: Needs query, filter, and common pagination fields
- **Semantic Search**: Needs vector embeddings and common fields
- **Hybrid Search**: Needs most of keyword and semantic fields plus a ratio

The six approaches discussed had benefits and drawbacks.

## Enter View-Types: A Macro-Driven Solution

The [view-types](https://github.com/mcmah309/view-types) was created to address some of the drawbacks. The crate provides a `views` macro for a declarative way to solve this problem by generating type-safe projections from a single source-of-truth data structure. It generates the code to quickly implement **Approach 4** (enum with complete structs) and **Approach 5** (monolithic with kind) while eliminating their major drawbacks.

### Application

Instead of choosing between the various manual approaches, you define your complete data structure once and declare which fields belong to which "views":

```rust
use view_types::views;

#[views(
    // Define fragments - reusable field groupings
    frag common {
        offset,
        limit,
        time_budget,
        ranking_score_threshold,
    }
    
    frag keyword_fields {
        Some(query),
        terms_matching_strategy,
        scoring_strategy,
        locales,
    }
    
    frag semantic_fields {
        Some(semantic),
    }
    
    // Define views - specific projections of your data
    pub view KeywordSearch<'a> {
        ..common,
        ..keyword_fields,
        Some(filter),
    }
    
    pub view SemanticSearch {
        ..common,
        ..semantic_fields,
    }
    
    pub view HybridSearch {
        ..common,
        ..keyword_fields,
        ..semantic_fields,
        Some(semantic_ratio),
    }
)]
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
    semantic: Option<Vec<u8>>,
    semantic_ratio: Option<f32>,
    // kind: SearchKind // optional kind for "kind" approach, but not needed for macro
}

// pub enum SearchKind {
//     Keyword,
//     Semantic,
//     Hybrid,
// }
```

Included in the generated code is
```rust
pub struct KeywordSearch<'a> {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    query: String,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    filter: Filter<'a>,
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
Including `*Ref` and `*Mut` versions of each, as well as the methods to convert into these types (see full expansion for inclusion). This effectively allows implementing a monolith with kind approach **Approach 5** with minimum boilerplate.

In addition to the previously mention generated code, code for **Approach 4** is also generated.
```rust
pub enum SearchVariant<'a> {
    KeywordSearch(KeywordSearch<'a>),
    SemanticSearch(SemanticSearch),
    HybridSearch(HybridSearch),
}

impl<'a> SearchVariant<'a> {
    pub fn offset(&self) -> &usize {
        match self {
            SearchVariant::KeywordSearch(view) => &view.offset,
            SearchVariant::SemanticSearch(view) => &view.offset,
            SearchVariant::HybridSearch(view) => &view.offset,
        }
    }
    pub fn ranking_score_threshold(&self) -> Option<&f64> {
        match self {
            SearchVariant::KeywordSearch(view) => view.ranking_score_threshold.as_ref(),
            SearchVariant::SemanticSearch(view) => view.ranking_score_threshold.as_ref(),
            SearchVariant::HybridSearch(view) => view.ranking_score_threshold.as_ref(),
            _ => None,
        }
    }
    pub fn limit(&self) -> &usize {
        match self {
            SearchVariant::KeywordSearch(view) => &view.limit,
            SearchVariant::SemanticSearch(view) => &view.limit,
            SearchVariant::HybridSearch(view) => &view.limit,
        }
    }
    pub fn semantic_ratio(&self) -> Option<&f32> {
        match self {
            SearchVariant::HybridSearch(view) => Some(&view.semantic_ratio),
            _ => None,
        }
    }
    pub fn filter(&self) -> Option<&Filter<'a>> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.filter),
            _ => None,
        }
    }
    pub fn locales(&self) -> Option<&Vec<Language>> {
        match self {
            SearchVariant::KeywordSearch(view) => view.locales.as_ref(),
            SearchVariant::HybridSearch(view) => view.locales.as_ref(),
            _ => None,
        }
    }
    pub fn semantic(&self) -> Option<&Vec<u8>> {
        match self {
            SearchVariant::SemanticSearch(view) => Some(&view.semantic),
            SearchVariant::HybridSearch(view) => Some(&view.semantic),
            _ => None,
        }
    }
    pub fn query(&self) -> Option<&String> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.query),
            SearchVariant::HybridSearch(view) => Some(&view.query),
            _ => None,
        }
    }
    pub fn time_budget(&self) -> &TimeBudget {
        match self {
            SearchVariant::KeywordSearch(view) => &view.time_budget,
            SearchVariant::SemanticSearch(view) => &view.time_budget,
            SearchVariant::HybridSearch(view) => &view.time_budget,
        }
    }
    pub fn terms_matching_strategy(&self) -> Option<&TermsMatchingStrategy> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.terms_matching_strategy),
            SearchVariant::HybridSearch(view) => Some(&view.terms_matching_strategy),
            _ => None,
        }
    }
    pub fn scoring_strategy(&self) -> Option<&ScoringStrategy> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.scoring_strategy),
            SearchVariant::HybridSearch(view) => Some(&view.scoring_strategy),
            _ => None,
        }
    }
}
```
This effectively allows implementing a enum with complete structs (**Approach 5**) with minimum boilerplate.

## Conclusion


*The view-types crate is available on [crates.io](https://crates.io/crates/view-types) and the source code can be found on [GitHub](https://github.com/mcmah309/view-types).*