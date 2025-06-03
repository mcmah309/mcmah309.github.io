---
layout: post
title: "The `Result` Type In Dart"
# subtitle: ""
date: 2024-07-02
categories: [technical]
tags: [dart]
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

# The Result Type In Dart

Every modern programming language has error handling. Like Python, Dart chose the unchecked try-catch catch pattern, Java went with checked try-catch pattern, Zig went with Error Unions, and Rust went the `Result` type.

## What Is a Result Monad Type And Why Use it?

`Result` is often referred to as a "monad". A monad is just a wrapper around an object that provides a standard way of interacting with the inner object. The
`Result` monad is used in place of throwing exceptions. Instead, the function
returns a `Result`, which can either be a `Ok` (Success) or `Err` (Error/Failure), `Result` is the sum type of the two.

Using `Result` provides a predictable control flow to a program. Error handling is explicit as the caller of a function
that returns an error must handle the possibility of an error at that point. At which the point, the calling function can resolve
any possible issue or clean its state, where necessary, or pass the error up the chain until a function resolves
the issue.

## The Problem With Dart Error Handling

The best way to illustrate the problem with Dart's error handling is an example. Consider the following program,
which doesn't do anything useful, but we are more interested in the control flow:
```dart
void main() {
  // try {
    print(order("Bob", 1));
  // } catch(e) {
    // print(e);
  // }
}

String order(String user, int orderNumber) {
  final result = makeFood(orderNumber);
  return "Order of $result is complete for $user";
}

String makeFood(int orderNumber) {
  return switch(orderNumber) {
    1 => makeHamburger(),
    2 => makePasta(),
    // Who catches this??
    // How do we know we won't forget to catch this??
    _ => throw Exception("Unknown order number '$orderNumber'."),
  };
}

String makeHamburger() => "Hamburger";
String makePasta() => "Pasta";
```
There are several issues with this program:
* If we forget to catch in the correct spot, we just introduced a bug or worse - crashed our entire program.
* We may later reuse `makeFood` or `order`, and forget that it can throw.
* The more we reuse functions that can throw, the less maintainable and error-prone our program becomes. 
* Throwing is also an expensive operation, as it requires stack unwinding.

### Result Type
Throughout the rest of this article we will be looking at the `Result` type in Dart as provided by the [rust_core](https://pub.dev/packages/rust_core)
package.

Here is the previous example implemented with `Result`:
```dart
import 'package:rust_core/result.dart';

void main() {
  print(order("Bob", 1));
}

Result<String, Exception> order(String user, int orderNumber) {
  final result = makeFood(orderNumber);
  if(result case Ok(:final ok)) { // Could also use "if(result.isOk())" or a switch statement
    return Ok("Order of $ok is complete for $user");
  }
  return result;
}

Result<String, Exception> makeFood(int orderNumber) {
  return switch(orderNumber) {
    1 => Ok(makeHamburger()),
    2 => Ok(makePasta()),
    _ => Err(Exception("Unknown order number '$orderNumber'.")),
  };
}

String makeHamburger() => "Hamburger";
String makePasta() => "Pasta";
```
By using `Result`, we have removed all undefined behaviors due to control flow! Thus eliminating
all previously mentioned issues.

You can interact with `Result` through conventions like
`case Ok(:final ok)` and `isOk()`, or methods like `.map(..)`, .`andThen(..)`, etc. Checking allows you to
either resolve any potential issues in the calling function or pass the error up the chain until a function resolves
the issue. This provides predictable control flow to your program, eliminating many potential bugs and countless
hours of debugging.

## Conclusion

In conclusion, adopting the `Result` type for error handling in Dart brings numerous benefits, especially in creating
predictable and maintainable control flows. Unlike traditional try-catch mechanisms, `Result` ensures that error
handling is explicit and unavoidable. Thus preventing potential bugs and improving code reliability.
The [rust_core](https://pub.dev/packages/rust_core) package's implementation
of `Result` in Dart provides a powerful tool for managing errors effectively, 
aligning Dart's error handling capabilities with those of more modern and robust systems like Rust.
Embracing this approach will not only enhance the stability of Dart applications but also streamline the 
development process, making it easier to maintain and debug code in the long run.