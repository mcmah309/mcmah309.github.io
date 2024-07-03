# Anyhow v1.2.0: Migration to rust_core

[anyhow](https://pub.dev/packages/anyhow)'s Result type was migrated into rust_core. Anyhow remains completely standalone, only re-exporting the `Result` Type from [rust_core](https://pub.dev/packages/rust_core), but gains compatibility with the rest of the rust_core ecosystem.

In addition to the newly compatible types and extensions, such as `Option` and the `cell` library, the `Result` type got a big upgrade. There will likely be a separate post explaining more when rust_core is officially announced. But the big news I want to mention is the Result type now supports "[Early Return Key Notation](https://github.com/mcmah309/rust_core/tree/master/lib/src/result#early-return-key-notation)" which is a derivative of "Do Notation".
```dart
void main(){
    usingTheEarlyReturnKey();
    usingRegularPatternMatching();
}

Result<int,String> usingTheEarlyReturnKey() => Result(($){ // Early Return Key
    // Will return here with 'Err("error")'
    int x = willAlwaysReturnErr()[$].toInt();
    return Ok(x);
});

Result<int,String> usingRegularPatternMatching(){
    int x;
    switch(willAlwaysReturnErr()){
    case Err(:final err):
        return Err(err);
    case Ok(:final ok):
        x = ok.toInt();
    }
    return Ok(x);
}

Result<double,String> willAlwaysReturnErr() => Err("error");
```
