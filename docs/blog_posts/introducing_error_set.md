# Introducing `error_set`: A Zig-Inspired Approach to Error Handling in Rust

Github: <https://github.com/mcmah309/error_set>

Following a recent discussion on reimagining Rust, many voiced the need for more terse error handling. While `anyhow` and `thiserror` serve their purposes, each comes with its trade-offs. This got me thinking: Is there a middle ground that combines flexibility with precision? 

Enter [error_set](https://github.com/mcmah309/error_set) a concept derived from [Zig](https://ziglang.org/documentation/master/#Error-Set-Type) that elegantly balances the definition of possible errors within a given scope while remaining succinct and developer-friendly.

Here's a sneak peek of how it looks:
```rust
error_set! {
    MediaError = {
        IoError(std::io::Error)
    } || BookParsingError || DownloadError || ParseUploadError;
    BookParsingError = {
        MissingBookDescription,
        CouldNotReadBook(std::io::Error),
    } || BookSectionParsingError;
    BookSectionParsingError = {
        MissingName,
        NoContents,
    };
    DownloadError = {
        InvalidUrl,
        CouldNotSaveBook(std::io::Error),
    };
    ParseUploadError = {
        MaximumUploadSizeReached,
        TimedOut,
        AuthenticationFailed,
    };
}
```

With `error_set`, we no longer need "god enums" that are used in scopes where some variants can never happen. Instead we can tersely define the errors in scope and coerce them into a superset if propagated up the call stack.