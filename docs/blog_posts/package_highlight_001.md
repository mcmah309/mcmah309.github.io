# Package Highlight: `dart_mappable`

[https://pub.dev/packages/dart_mappable](https://pub.dev/packages/dart_mappable)

Many developers are familiar with the [freezed](https://pub.dev/packages/freezed) package, but fewer have heard of [dart_mappable](https://pub.dev/packages/dart_mappable). Both packages aim to bring [data classes](https://kotlinlang.org/docs/data-classes.html) to Dart, but `dart_mappable` makes a few tradeoffs to offer significant benefits in return.

From the documentation:
> dart_mappable covers all basic features (from/to json, == override, hashCode, toString(), copyWith) while adding new or improved support for advanced use-cases including generics, inheritance and polymorphism, customization, and more.

Additionally, it requires far less boilerplate. Let's see it in action:

***dart_mappable***
```dart
part 'model.mapper.dart';

@MappableClass()
class MyClass with MyClassMappable {
  final int myValue;

  MyClass({required this.myValue});
}
```
vs

***freezed***
```dart
part 'model.freezed.dart';
part 'model.g.dart';

@freezed
class MyClass with _$MyClass {
  @JsonSerializable(explicitToJson: true)
  factory DocumentInfoLocalData({
    required final int myValue,
  }) = _MyClass;

  factory MyClass.fromJson(Map<String, dynamic> json) => _$MyClassFromJson(json);
}
```
## Benefits
### Boilerplate
With `dart_mappable` the code is a lot more concise and forgiving to Dart developers. It's difficult to make a syntactic error with `dart_mappable` - just add `@MappableClass()` and `with <class_name>Mappable`. While with `freezed`, it is pretty easy to mess up all the syntactic nuances `required final ..`, `@Default(...) final ..`, `_$`, `_`, `_$..FromJson`, `@JsonSerializable(explicitToJson: true)`, `factory`, etc. With `dart_mappable` you just write dart code and it takes care of the rest.
### Custom Constructors and Flexibility
Conciseness is great, but functionality is also important. With `dart_mappable`, you are not restricted to a `freezed`-like constructor; you can use any Dart constructor you prefer:
```dart
MyClass(this.myValue);
const MyClass(this.myValue);
MyClass(this.myValue, [this.otherValue = 1]);
MyClass(this.myValue, {this.otherValue}): assert(myValue > 0); // not `@Assert('...')` needed
MyClass(this.myValue) {
    date = DateTime.now(); // Non-const default values :)
    // other logic
}
```
### Generics and Inheritance
Dealing with generics is easy, since only regular dart code is needed, there's no need to use additional annotations like `@With` or `@Implements`.
## Drawbacks
Since you do not declare a `fromJson` constructor with `dart_mappable` it generates one for you, folling the `<class_name>Mapper`
convention.
```dart
MyClassMapper.fromJson(json);
```
This is really a style preference since with `freezed` you have to reference the class anyways (`MyClass.fromJson(json`).
This may become more useful if the lanugage team ever decides to support [abstract static methods](https://github.com/dart-lang/language/issues/356).

Another difference that some may consider a benefit or drawback is `freezed` tries to force immutability (unless you use `@unfreezed`).
While `dart_mapper` leaves that it up to the user. Personally I always lean towards more power to the developer.

## Conclusion
At the end of the day, `dart_mappable` gives Dart developers all the capabilities they usually choose `freezed` for, without getting in their way.

Looking ahead, both of these approaches might become obsolete when [static metaprogramming](https://github.com/dart-lang/language/issues/1482) lands in early 2025.