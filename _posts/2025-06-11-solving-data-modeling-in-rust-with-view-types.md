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

In the previous article, [Patterns for Modeling Overlapping Variant Data in Rust]({% post_url 2025-06-11-patterns-for-modeling-overlapping-variant-data-in-rust %}), six different approaches to modeling overlapping data structures were explored, each with their own trade-offs between type safety, code duplication, and API flexibility. Today, I want to introduce a solution that addresses many of these challenges: the [view-types](https://github.com/mcmah309/view-types) macro.

## Recap: The Challenge

When building complex systems, we often need to model data that has overlapping but not identical field requirements. In the search engine example, we had:

- **Keyword Search**: Needs query, filter, and common pagination fields
- **Semantic Search**: Needs vector embeddings and common fields
- **Hybrid Search**: Needs most of keyword and semantic fields plus a ratio

The six approaches discussed had their own benefits and drawbacks.

## Enter View-Types: A Macro-Driven Solution

The [view-types](https://github.com/mcmah309/view-types) crate was created to address some of the drawbacks of the previously discussed approaches. The crate provides a `views` macro for a declarative way to solve this problem by generating type-safe projections from a single source-of-truth data structure. The macro generates the code to quickly implement [Approach 4][approach-4] (enum with complete structs) and [Approach 5][approach-5] (monolithic with kind), as well as associated structures and methods.

For detailed documentation on how the macro works, see the [README](https://github.com/mcmah309/view-types).

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

<details  markdown="1">
<summary>Macro Expansion</summary>

```rust
// Recursive expansion of views macro
// ===================================

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
}
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
pub struct KeywordSearchRef<'original, 'a> {
    offset: &'original usize,
    limit: &'original usize,
    time_budget: &'original TimeBudget,
    ranking_score_threshold: &'original Option<f64>,
    query: &'original String,
    terms_matching_strategy: &'original TermsMatchingStrategy,
    scoring_strategy: &'original ScoringStrategy,
    locales: &'original Option<Vec<Language>>,
    filter: &'original Filter<'a>,
}
pub struct KeywordSearchMut<'original, 'a> {
    offset: &'original mut usize,
    limit: &'original mut usize,
    time_budget: &'original mut TimeBudget,
    ranking_score_threshold: &'original mut Option<f64>,
    query: &'original mut String,
    terms_matching_strategy: &'original mut TermsMatchingStrategy,
    scoring_strategy: &'original mut ScoringStrategy,
    locales: &'original mut Option<Vec<Language>>,
    filter: &'original mut Filter<'a>,
}
impl<'original, 'a> KeywordSearch<'a> {
    pub fn as_ref(&'original self) -> KeywordSearchRef<'original, 'a> {
        KeywordSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            query: &self.query,
            terms_matching_strategy: &self.terms_matching_strategy,
            scoring_strategy: &self.scoring_strategy,
            locales: &self.locales,
            filter: &self.filter,
        }
    }
    pub fn as_mut(&'original mut self) -> KeywordSearchMut<'original, 'a> {
        KeywordSearchMut {
            offset: &mut self.offset,
            limit: &mut self.limit,
            time_budget: &mut self.time_budget,
            ranking_score_threshold: &mut self.ranking_score_threshold,
            query: &mut self.query,
            terms_matching_strategy: &mut self.terms_matching_strategy,
            scoring_strategy: &mut self.scoring_strategy,
            locales: &mut self.locales,
            filter: &mut self.filter,
        }
    }
}
pub struct SemanticSearch {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    semantic: Vec<u8>,
}
pub struct SemanticSearchRef<'original> {
    offset: &'original usize,
    limit: &'original usize,
    time_budget: &'original TimeBudget,
    ranking_score_threshold: &'original Option<f64>,
    semantic: &'original Vec<u8>,
}
pub struct SemanticSearchMut<'original> {
    offset: &'original mut usize,
    limit: &'original mut usize,
    time_budget: &'original mut TimeBudget,
    ranking_score_threshold: &'original mut Option<f64>,
    semantic: &'original mut Vec<u8>,
}
impl<'original> SemanticSearch {
    pub fn as_ref(&'original self) -> SemanticSearchRef<'original> {
        SemanticSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            semantic: &self.semantic,
        }
    }
    pub fn as_mut(&'original mut self) -> SemanticSearchMut<'original> {
        SemanticSearchMut {
            offset: &mut self.offset,
            limit: &mut self.limit,
            time_budget: &mut self.time_budget,
            ranking_score_threshold: &mut self.ranking_score_threshold,
            semantic: &mut self.semantic,
        }
    }
}
pub struct HybridSearch {
    offset: usize,
    limit: usize,
    time_budget: TimeBudget,
    ranking_score_threshold: Option<f64>,
    query: String,
    terms_matching_strategy: TermsMatchingStrategy,
    scoring_strategy: ScoringStrategy,
    locales: Option<Vec<Language>>,
    semantic: Vec<u8>,
    semantic_ratio: f32,
}
pub struct HybridSearchRef<'original> {
    offset: &'original usize,
    limit: &'original usize,
    time_budget: &'original TimeBudget,
    ranking_score_threshold: &'original Option<f64>,
    query: &'original String,
    terms_matching_strategy: &'original TermsMatchingStrategy,
    scoring_strategy: &'original ScoringStrategy,
    locales: &'original Option<Vec<Language>>,
    semantic: &'original Vec<u8>,
    semantic_ratio: &'original f32,
}
pub struct HybridSearchMut<'original> {
    offset: &'original mut usize,
    limit: &'original mut usize,
    time_budget: &'original mut TimeBudget,
    ranking_score_threshold: &'original mut Option<f64>,
    query: &'original mut String,
    terms_matching_strategy: &'original mut TermsMatchingStrategy,
    scoring_strategy: &'original mut ScoringStrategy,
    locales: &'original mut Option<Vec<Language>>,
    semantic: &'original mut Vec<u8>,
    semantic_ratio: &'original mut f32,
}
impl<'original> HybridSearch {
    pub fn as_ref(&'original self) -> HybridSearchRef<'original> {
        HybridSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            query: &self.query,
            terms_matching_strategy: &self.terms_matching_strategy,
            scoring_strategy: &self.scoring_strategy,
            locales: &self.locales,
            semantic: &self.semantic,
            semantic_ratio: &self.semantic_ratio,
        }
    }
    pub fn as_mut(&'original mut self) -> HybridSearchMut<'original> {
        HybridSearchMut {
            offset: &mut self.offset,
            limit: &mut self.limit,
            time_budget: &mut self.time_budget,
            ranking_score_threshold: &mut self.ranking_score_threshold,
            query: &mut self.query,
            terms_matching_strategy: &mut self.terms_matching_strategy,
            scoring_strategy: &mut self.scoring_strategy,
            locales: &mut self.locales,
            semantic: &mut self.semantic,
            semantic_ratio: &mut self.semantic_ratio,
        }
    }
}
pub enum SearchVariant<'a> {
    KeywordSearch(KeywordSearch<'a>),
    SemanticSearch(SemanticSearch),
    HybridSearch(HybridSearch),
}
impl<'a> SearchVariant<'a> {
    pub fn ranking_score_threshold(&self) -> Option<&f64> {
        match self {
            SearchVariant::KeywordSearch(view) => view.ranking_score_threshold.as_ref(),
            SearchVariant::SemanticSearch(view) => view.ranking_score_threshold.as_ref(),
            SearchVariant::HybridSearch(view) => view.ranking_score_threshold.as_ref(),
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
    pub fn time_budget(&self) -> &TimeBudget {
        match self {
            SearchVariant::KeywordSearch(view) => &view.time_budget,
            SearchVariant::SemanticSearch(view) => &view.time_budget,
            SearchVariant::HybridSearch(view) => &view.time_budget,
        }
    }
    pub fn filter(&self) -> Option<&Filter<'a>> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.filter),
            _ => None,
        }
    }
    pub fn semantic_ratio(&self) -> Option<&f32> {
        match self {
            SearchVariant::HybridSearch(view) => Some(&view.semantic_ratio),
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
    pub fn query(&self) -> Option<&String> {
        match self {
            SearchVariant::KeywordSearch(view) => Some(&view.query),
            SearchVariant::HybridSearch(view) => Some(&view.query),
            _ => None,
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
    pub fn semantic(&self) -> Option<&Vec<u8>> {
        match self {
            SearchVariant::SemanticSearch(view) => Some(&view.semantic),
            SearchVariant::HybridSearch(view) => Some(&view.semantic),
            _ => None,
        }
    }
    pub fn offset(&self) -> &usize {
        match self {
            SearchVariant::KeywordSearch(view) => &view.offset,
            SearchVariant::SemanticSearch(view) => &view.offset,
            SearchVariant::HybridSearch(view) => &view.offset,
        }
    }
}
impl<'original, 'a> Search<'a> {
    pub fn into_keyword_search(self) -> Option<KeywordSearch<'a>> {
        Some(KeywordSearch {
            offset: self.offset,
            limit: self.limit,
            time_budget: self.time_budget,
            ranking_score_threshold: self.ranking_score_threshold,
            query: if let Some(query) = self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: self.terms_matching_strategy,
            scoring_strategy: self.scoring_strategy,
            locales: self.locales,
            filter: if let Some(filter) = self.filter {
                filter
            } else {
                return None;
            },
        })
    }
    pub fn as_keyword_search(&'original self) -> Option<KeywordSearchRef<'original, 'a>> {
        Some(KeywordSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            query: if let Some(query) = &self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: &self.terms_matching_strategy,
            scoring_strategy: &self.scoring_strategy,
            locales: &self.locales,
            filter: if let Some(filter) = &self.filter {
                filter
            } else {
                return None;
            },
        })
    }
    pub fn as_keyword_search_mut(&'original mut self) -> Option<KeywordSearchMut<'original, 'a>> {
        Some(KeywordSearchMut {
            offset: {
                let offset = &mut self.offset;
                offset
            },
            limit: {
                let limit = &mut self.limit;
                limit
            },
            time_budget: {
                let time_budget = &mut self.time_budget;
                time_budget
            },
            ranking_score_threshold: {
                let ranking_score_threshold = &mut self.ranking_score_threshold;
                ranking_score_threshold
            },
            query: if let Some(query) = &mut self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: {
                let terms_matching_strategy = &mut self.terms_matching_strategy;
                terms_matching_strategy
            },
            scoring_strategy: {
                let scoring_strategy = &mut self.scoring_strategy;
                scoring_strategy
            },
            locales: {
                let locales = &mut self.locales;
                locales
            },
            filter: if let Some(filter) = &mut self.filter {
                filter
            } else {
                return None;
            },
        })
    }
    pub fn into_semantic_search(self) -> Option<SemanticSearch> {
        Some(SemanticSearch {
            offset: self.offset,
            limit: self.limit,
            time_budget: self.time_budget,
            ranking_score_threshold: self.ranking_score_threshold,
            semantic: if let Some(semantic) = self.semantic {
                semantic
            } else {
                return None;
            },
        })
    }
    pub fn as_semantic_search(&'original self) -> Option<SemanticSearchRef<'original>> {
        Some(SemanticSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            semantic: if let Some(semantic) = &self.semantic {
                semantic
            } else {
                return None;
            },
        })
    }
    pub fn as_semantic_search_mut(&'original mut self) -> Option<SemanticSearchMut<'original>> {
        Some(SemanticSearchMut {
            offset: {
                let offset = &mut self.offset;
                offset
            },
            limit: {
                let limit = &mut self.limit;
                limit
            },
            time_budget: {
                let time_budget = &mut self.time_budget;
                time_budget
            },
            ranking_score_threshold: {
                let ranking_score_threshold = &mut self.ranking_score_threshold;
                ranking_score_threshold
            },
            semantic: if let Some(semantic) = &mut self.semantic {
                semantic
            } else {
                return None;
            },
        })
    }
    pub fn into_hybrid_search(self) -> Option<HybridSearch> {
        Some(HybridSearch {
            offset: self.offset,
            limit: self.limit,
            time_budget: self.time_budget,
            ranking_score_threshold: self.ranking_score_threshold,
            query: if let Some(query) = self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: self.terms_matching_strategy,
            scoring_strategy: self.scoring_strategy,
            locales: self.locales,
            semantic: if let Some(semantic) = self.semantic {
                semantic
            } else {
                return None;
            },
            semantic_ratio: if let Some(semantic_ratio) = self.semantic_ratio {
                semantic_ratio
            } else {
                return None;
            },
        })
    }
    pub fn as_hybrid_search(&'original self) -> Option<HybridSearchRef<'original>> {
        Some(HybridSearchRef {
            offset: &self.offset,
            limit: &self.limit,
            time_budget: &self.time_budget,
            ranking_score_threshold: &self.ranking_score_threshold,
            query: if let Some(query) = &self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: &self.terms_matching_strategy,
            scoring_strategy: &self.scoring_strategy,
            locales: &self.locales,
            semantic: if let Some(semantic) = &self.semantic {
                semantic
            } else {
                return None;
            },
            semantic_ratio: if let Some(semantic_ratio) = &self.semantic_ratio {
                semantic_ratio
            } else {
                return None;
            },
        })
    }
    pub fn as_hybrid_search_mut(&'original mut self) -> Option<HybridSearchMut<'original>> {
        Some(HybridSearchMut {
            offset: {
                let offset = &mut self.offset;
                offset
            },
            limit: {
                let limit = &mut self.limit;
                limit
            },
            time_budget: {
                let time_budget = &mut self.time_budget;
                time_budget
            },
            ranking_score_threshold: {
                let ranking_score_threshold = &mut self.ranking_score_threshold;
                ranking_score_threshold
            },
            query: if let Some(query) = &mut self.query {
                query
            } else {
                return None;
            },
            terms_matching_strategy: {
                let terms_matching_strategy = &mut self.terms_matching_strategy;
                terms_matching_strategy
            },
            scoring_strategy: {
                let scoring_strategy = &mut self.scoring_strategy;
                scoring_strategy
            },
            locales: {
                let locales = &mut self.locales;
                locales
            },
            semantic: if let Some(semantic) = &mut self.semantic {
                semantic
            } else {
                return None;
            },
            semantic_ratio: if let Some(semantic_ratio) = &mut self.semantic_ratio {
                semantic_ratio
            } else {
                return None;
            },
        })
    }
}
```

</details>

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
with `*Ref` and `*Mut` versions of each, as well as the methods to convert into these types (see full expansion drop down above for inclusion). This effectively allows implementing a "monolith with kind approach" ([Approach 5][approach-5]) with minimum boilerplate.

In addition to the previously mentioned generated code, code for "enum with complete structs" ([Approach 4][approach-4]) is also generated.
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

## Real World Examples

For the [error_set](https://github.com/mcmah309/error_set) crate, internal error representations were implemented using [Approach 4][approach-4] by hand. By using `view-types`, almost all the boilerplate can be removed [PR](https://github.com/mcmah309/error_set/pull/30/files).

As an example, for the same crate, the original hand written approach was replaced with [Approach 5][approach-5] and the `view-types` crate. However, since it was originally implemented with [Approach 4][approach-4], a few more code changes around the codebase were needed to implement [Approach 5][approach-5] - [PR](https://github.com/mcmah309/error_set/pull/28/files).

## Conclusion

The `view-types` macro solves the data modeling challenges outlined in the previous article by generating boilerplate for both [Approach 4][approach-4] (enum with complete structs) and [Approach 5][approach-5] (monolithic with kind). This provides flexibility to choose your preferred API style without sacrificing type safety or maintainability.

The macro delivers zero code duplication, compile-time type safety, API flexibility, and easy maintenance when adding new fields or views. It excels for complex data structures with overlapping field requirements that may evolve over time. `view-types` transforms challenging data modeling into straightforward declarations of intent.

*The view-types crate is available on [crates.io](https://crates.io/crates/view-types) and the source code can be found on [GitHub](https://github.com/mcmah309/view-types).*

[approach-4]: {% post_url 2025-06-11-patterns-for-modeling-overlapping-variant-data-in-rust %}#approach-4-enum-with-complete-structs
[approach-5]: {% post_url 2025-06-11-patterns-for-modeling-overlapping-variant-data-in-rust %}#approach-5-monolith-with-kind