# rust_core 0.4 Release and Project Update

github: <https://github.com/mcmah309/rust_core>
pub: <https://pub.dev/packages/rust_core>

## Background
[rust_core](https://github.com/mcmah309/rust_core) is an implementation of the Rust's core library in Dart. The goal is to bring Rust's features and ergonomics to
Dart. This also provides a seamless developer experience for any developer using both languages.

## 0.4
### Option
A lot of possibilities opened up with Dart 3.3.0 release. Zero cost abstraction with extension types is a powerful tool. Thus, we migrated
the `Option` class to an extension type. Since exclusive nullable type extensions are not possible, `Option` fills this gap
with zero allocation runtime cost and chaining null aware operations.
```dart
    Option<int> intOptionFunc() => const None();
    double halfVal(int val) => val/2;
    Option<double> val = intOptionFunc().map(halfVal);
    expect(val.unwrapOr(2.0), 2.0);
```
Considering `Option` also supports early return key notation.
```dart
    Option<int> intNone() => const None();
    Option<double> earlyReturn(int val) => Option(($) { // Early Return Key
      // Returns here, no need to do a `if null return`
      double x = intNone()[$].toDouble();
      return Some(val + x);
    });
    expect(earlyReturn(2), const None());
```
And transitioning between is ergonomic
```dart
    Option<int> option = intNone();
    int? nullable = option.v;
    nullable = option.toNullable(); // or
    option = nullable.toOption();
```
`Option` seems like the go to when compared to using nullable directly when developing api's or a least a solid companion.

### Slice and Iter
Included in `0.4` are two new libraries `slice` and `iter` being developed but with the usual full test coverage guarantee of rust_core.

A `Slice` is a contiguous sequence of elements in a [List]. Slices are a view into a list without allocating and copying to a new list,
thus slices are more efficient than creating a sublist, but they do not own their own data. That means shrinking the original list can cause the slice's range to become invalid, which may cause an exception.

`Slice` also have a lot of efficient methods for in-place mutation within and between slices. e.g.

```dart
    var list = [1, 2, 3, 4, 5];
    var slice = Slice(list, 1, 4);
    expect(slice, [2, 3, 4]);
    var taken = slice.takeLast();
    expect(taken, 4);
    expect(slice, [2, 3]);
    slice[1] = 10;
    expect(list, [1, 2, 10, 4, 5]);
```

A Dart `Iterable` is analogous to a Rust `Iterator`. Since Dart already has an `Iterator` class, to avoid confusion,
the Dart implementation of the Rust iterator is `RIterator`. `RIterator` is a zero cost extension type of `Iterable`. `RIterator`
makes working with collections of `rust_core` types and regular Dart types a breeze. e.g.

```dart
    var list = [1, 2, 3, 4, 5];
    var filtered = list.iter().filterMap((e) {
      if (e % 2 == 0) {
        return Some(e * 2);
      }
      return None();
    });
    expect(filtered, [4, 8]);
```
### Misc
Various additional extension methods were added.

## Future
rust_core for being in pre-release is stable with about 400 tests and currently used in major applications under development internally. `0.4` May be the last
minor release before `1.0.0` but there also may be a `0.5.0` release.

Two new packages are under development [rewind] and [rust_std](https://github.com/mcmah309/rust_std).
- [rewind](https://github.com/mcmah309/rewind) Log exactly what you want, while being aware of [anyhow] types.
- [rust_std](https://github.com/mcmah309/rust_std) An implementation of Rust's standard library in Dart.