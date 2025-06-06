---
layout: post
title: "Announcing Rust Core in Dart: Program in Dart Like You Would in Rust"
# subtitle: ""
date: 2023-12-11
categories: [technical]
tags: [dart, rust]
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

For Rust developers involved in programming with Dart, or Dart developers interested in idiomatic and safe programming, we have developed "rust_core," a package designed to implement Rust's core library in Dart. `Result`, `Option`, `Cell`, `OnceCell`, `LazyCell`, etc. Are all done, along with nearly 200 extension methods for different scenarios, such as `Future<Result<S,F>>`, `Result<Option<S>,F>`, `Result<S?,F>`, etc. just to name a few.

Pub: <https://pub.dev/packages/rust_core>

Github: <https://github.com/mcmah309/rust_core>

A link you might also be interest in [Dart Equivalent To The Rust "?" Early Return Operator](https://mcmah309.github.io/rust_core/introduction/quickstart.html#the-rust--operator-and-early-return-key-notion)