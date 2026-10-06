---
title: Rust Has Near Perfect Error Handling Yet Most Aren't Using It
date: 2026-10-06
authors:
- Dillon McMahon
taxonomies:
  tags:
  - rust
extra:
  share: true
---

Rust already has most of what I want from error handling: explicit control flow, errors as values, and concise propagation with `?`. The friction comes when deciding what to put in the error half of `Result`. We often end up choosing between precise types that require boilerplate and convenient types that hide which errors can occur. [eros](https://github.com/mcmah309/eros) brings these approaches together, while keeping context attached as errors travel through the call stack.

<!-- more -->

## The Problem With Rust Error Handling

Consider reading a server port from a file. Reading can fail with an `io::Error`, and parsing can fail with a `ParseIntError`. A conventional implementation might look like this:

```rust
use std::{io, num::ParseIntError};

#[derive(Debug, thiserror::Error)]
pub enum PortError {
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error(transparent)]
    Parse(#[from] ParseIntError),
}

fn load_port(path: &str) -> Result<u16, PortError> {
    let contents = std::fs::read_to_string(path)?;
    Ok(contents.trim().parse()?)
}
```

[thiserror](https://github.com/dtolnay/thiserror) removes the manual `Display`, `Error`, and `From` implementations. But we still have to decide how this enum relates to every other error enum in our program.

Now load a host address, bind a socket, and initialize a database. Each operation has its own errors. We can wrap those enums in another enum, flatten their variants into a new enum, or give everything one large crate-wide error type. The first approach creates nesting, the second creates conversions, and the third means functions advertise errors they cannot actually return. An I/O error may also end up in several different nested variants, making handling it at a higher level unnecessarily awkward.

Alternatively, [anyhow](https://github.com/dtolnay/anyhow) makes propagation and attaching context straightforward. We can downcast when we need to inspect a concrete error. However, the function signature no longer tells us which error types are possible, and the compiler cannot track whether we have handled all of them.

The usual advice is to use typed errors in libraries and opaque errors in applications. But applications need typed recovery too, and libraries often contain internal operations whose callers only need to propagate a failure. The useful distinction is whether a caller needs to **do something different based on the error type**.

## Error Sets Without Enum Boilerplate

The examples below use these dependencies in `Cargo.toml`:

```toml
[dependencies]
eros = "0.8"
thiserror = "2"
```

With `eros`, the port example becomes:

```rust
use eros::IntoUnion;
use std::{io, num::ParseIntError};

fn load_port(path: &str) -> eros::Result<u16, (io::Error, ParseIntError)> {
    let contents = std::fs::read_to_string(path).union()?;
    contents.trim().parse().union()
}
```

No new enum or conversions need to be declared.

`eros::Result<T, E>` is an alias for the ordinary `Result<T, ErrorUnion<E>>`. Here, `ErrorUnion<(io::Error, ParseIntError)>` holds **one** of the listed errors. The tuple describes the possible types; it does not store both errors. This is an *open sum type*: we describe the combination we need without declaring a new named enum for that combination.

`.union()` wraps an ordinary result's error in an `ErrorUnion`, inferring the destination set from the surrounding code. If we remove `io::Error` from this signature, the file read no longer compiles. We cannot accidentally propagate an error that the signature does not include.

For reuse, the set can be named with a normal type alias:

```rust
type PortErrors = (std::io::Error, std::num::ParseIntError);
```

The errors can come from the standard library, dependencies, or custom types defined with `thiserror`. Eros handles combining them.

### Composing Functions

Suppose we also load the server's host address. Building on `load_port`:

```rust
use eros::ReshapeUnion;
use std::net::{AddrParseError, IpAddr, TcpListener};

fn load_host(path: &str) -> eros::Result<IpAddr, (io::Error, AddrParseError)> {
    let contents = std::fs::read_to_string(path).union()?;
    contents.trim().parse().union()
}

fn bind_server() -> eros::Result<TcpListener, (io::Error, AddrParseError, ParseIntError)> {
    let host = load_host("config/host.txt").widen()?;
    let port = load_port("config/port.txt").widen()?;
    TcpListener::bind((host, port)).union()
}
```

`.widen()` converts an existing union into a union whose set contains all its possible errors. Both configuration operations can return an `io::Error`, so we list it once. Context can describe which operation failed.

Widening into a set that omits a possible error is rejected at compile time.

> Side: Rust's overlapping `From` implementations prevent Eros from making every conversion implicit, hence the `.union()` and `.widen()` calls before `?` when signature changes are needed.

## Handling Errors Changes The Type

Declaring precise errors becomes much more useful when handling an error removes it from the set.

For example, suppose our policy is to use port 8080 whenever reading the port file fails, while still rejecting malformed contents:

```rust
fn port_or_default(path: &str) -> eros::Result<u16, (ParseIntError,)> {
    load_port(path).recover::<io::Error, _>(|error| {
        eprintln!("{error:?}; using port 8080");
        8080
    })
}
```

The return type now contains only `ParseIntError`. `recover` handles the selected error type and turns the handler's value into a success. Other errors pass through unchanged. The handler retains the error's context and backtrace.

We can also recover a group of error types. If both unreadable files and invalid numbers should use a default, all possible errors can be removed:

```rust
fn forgiving_port(path: &str) -> u16 {
    load_port(path)
        .recover::<(io::Error, ParseIntError), _>(|_| 8080)
        .into_value()
}
```

After recovery, the result has the empty error set `()`. `.into_value()` extracts the value, and only compiles when no possible errors remain.

### Fallible Recovery

A fallback can also fail. `try_recover` lets its handler return another result:

```rust
use eros::ErrorUnion;

fn port_with_fallback(path: &str, fallback: &str) -> eros::Result<u16, (ParseIntError,)> {
    load_port(path).try_recover(|error: ErrorUnion<(io::Error,)>| {
        eprintln!("{error:?}; parsing fallback port");
        fallback.parse::<u16>().union()
    })
}
```

The output set covers both the unhandled errors and any errors from the fallback. Here, either the file contents or the fallback can produce a `ParseIntError`.

## Types Only Where They Matter

Sometimes the caller has no useful recovery policy. It only needs to propagate an error or report it at the top of the program. Eros supports that directly:

```rust
fn load_port_untyped(path: &str) -> eros::Result<u16> {
    let contents = std::fs::read_to_string(path)?;
    Ok(contents.trim().parse()?)
}
```

Without a tuple, the error set defaults to `AnyError`. Ad hoc failures can be created with `error!`, `bail!`, and `ensure!`:

```rust
fn validate_port(port: u16) -> eros::Result<()> {
    eros::ensure!(port != 0, "Server port must be nonzero");
    Ok(())
}
```

Typed results can flow into this catch-all form with `?` as well:

```rust
fn start_server() -> eros::Result<TcpListener> {
    Ok(bind_server()?)
}
```

We can keep lower-level functions precise for callers that need recovery, while allowing other callers to propagate the same errors through a simpler signature. Context and backtraces survive this conversion.

We can also select known error types from `AnyError` with `.narrow()`:

```rust
fn select_port_error(error: ErrorUnion) -> Result<ErrorUnion<PortErrors>, ErrorUnion> {
    error.narrow::<PortErrors, _>()
}
```

The stored error is checked at runtime. An `io::Error` or `ParseIntError` returns in the typed union; anything else remains `AnyError`. Both branches retain the error's diagnostics.

Similarly, `.recover::<io::Error, _>(|_| 8080)` can handle I/O failures in an untyped result. The remaining error set stays `AnyError`, since other error types are still possible.

The useful distinction is whether the caller needs the compiler to track the possible error types. If it only needs to propagate or report a failure, carrying every type through the signature may just be noise.

## Errors Need Operational Context

A precise error type does not tell us which file was being read or why. `PermissionDenied` is useful for making a decision, but we still need the path and operation to understand the failure.

Eros provides `.context()` and lazy `.with_context()` methods. It also provides a function attribute that attaches context to any error returned from the function:

```rust
use eros::{Context, context};

#[context("Load server port from {}", path)]
fn load_port_with_context(path: &str) -> eros::Result<u16, (io::Error, ParseIntError)> {
    let contents = std::fs::read_to_string(path).union()?;
    contents.trim().parse().union()
}

fn configure_server(path: &str) -> eros::Result<u16> {
    Ok(load_port_with_context(path).context("Configure server")?)
}

fn main() {
    if let Err(error) = configure_server("config/port.txt").context("Start application") {
        eprintln!("{error:#?}");
    }
}
```

If the file contains an invalid number, the report is:

```text
invalid digit found in string

  Context (innermost first):
    1. Load server port from config/port.txt
    2. Configure server
    3. Start application
```

The original error stays the main message, with the operations listed in the order they were added.

For context consisting of selected parameters, the format can be generated:

```rust
#[context]
fn read_port(#[fmt("{}")] path: &str) -> eros::Result<u16> {
    load_port_untyped(path)
}
```

Only annotated parameters are included.

I generally prefer a function to describe its own operation and relevant inputs. Every caller then gets that context. Call sites can add context too, when they know something the callee does not. We can report the failure once with the operations that led to it.

### Reporting The Error

The formatting choices have distinct purposes:

| Format | Output |
| --- | --- |
| `{}` | Inner error and its source chain |
| `{:#}` | Inner error only |
| `{:?}` | Error, sources, context, and available locations and backtrace |
| `{:#?}` | Error, sources, and context, omitting locations and backtrace |

With `tracing`, `error = ?error` uses the detailed report and `error = %error` uses `Display`.

## Using Eros Across API Boundaries

Eros works with normal `Result` values, so adoption can happen one function at a time. A dependency's error can enter a union through `.union()`.

Inside a library, we can compose typed sets and still expose a conventional public error enum. For example, using the original `PortError`:

```rust
use eros::E2;

pub fn public_load_port(path: &str) -> Result<u16, PortError> {
    load_port(path).map_err(|error| match error.into_enum() {
        E2::A(error) => PortError::Io(error),
        E2::B(error) => PortError::Parse(error),
    })
}
```

`.into_enum()` produces an enum for exhaustive matching, with variants corresponding to the tuple's order. It extracts the errors and discards Eros diagnostics. `.as_enum()` provides borrowed matching while keeping the union intact.

For APIs that require `core::error::Error`, `.into_std_error()` provides an adapter that retains diagnostics. Existing `anyhow` errors can also be integrated through the optional `anyhow` feature and `ErrorUnion::from_anyhow`.

## Portability And Performance

Stored errors must implement `core::error::Error + Send + Sync + 'static`. The same constructs work in synchronous and asynchronous code, and Eros supports `no_std` with `alloc` when default features are disabled.

Context and backtrace support are enabled by default. Libraries can disable default features and let the final application choose the diagnostics it needs. The optional `location` feature records source locations and works without `std`.

The error and its diagnostics live in a boxed allocation. This keeps the union's stack size independent of its possible errors, and widening or erasing the set reuses that allocation. Creating an error still has an allocation cost, and context and backtrace capture have their own costs.

## Conclusion

I previously explored precise error sets with [error_set](@/posts/2024-04-08-introducing-error-set.md). Eros takes that idea further by combining error sets with optional type erasure, recovery that removes handled types, and diagnostics that survive composition.

This is why I think Rust's error handling is near perfect with the right constructs. `Result` gives us explicit control flow, `?` gives us concise propagation, and `ErrorUnion` lets each function describe the errors its callers need to reason about. We can handle those errors where there is a useful policy, simplify the signature where there is not, and keep the operational context needed to understand a failure.

*The eros source and README are available on [GitHub](https://github.com/mcmah309/eros).*
