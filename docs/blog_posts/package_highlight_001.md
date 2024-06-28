# Package Highlight #1 `dart_mappable`

[https://pub.dev/packages/dart\_mappable](https://pub.dev/packages/dart_mappable)

Most developers are aware of the [freezed](https://pub.dev/packages/freezed) package, but less so have heard of [dart_mappable](https://pub.dev/packages/dart_mappable). `dart_mappable` makes the trade of allowing field mutability gets a host of benefits in return. From the docs:

> all basic feature (from/to json, == override, hashCode, toString(), copyWith) while adding new or improved support for advances use-cases including generics, inheritance and polymorphism, customization and more.

Plus far less boilplate. Let's see it in action.

***dart_mappable***
```dart
part 'model.mapper.dart';

@MappableClass()
class MyClass with MyClassMappable {
  final int myValue;

  MyClass({required this.myValue});
}
```
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
With `dart_mappable` the code is a lot more concise and forgiving to Dart developers. One would be hardpressed to mess up the syntax of `dart_mappable` - just add `@MappableClass()` and `with <class_name>Mappable`. While with `freezed`, it is pretty easy to mess up all the syntactic nuances `required final ..` `@Default(...) final ..`, `_$`, `_`, `_$..FromJson`, `@JsonSerializable(explicitToJson: true)`, `factory`, etc. With `dart_mappable` you just write dart code and it takes care of the rest.

Conciseness is great, but functionability also matters. Well, just being able to write Dart code lets you have all the powers of Dart code (of course)! You are not beholden to a `freezed` like constructor, use any dart one you like
```dart
MyClass(this.myValue);
```
```dart
const MyClass(this.myValue);
```
```dart
MyClass(this.myValue, [this.otherValue = 1]);
```
```dart
MyClass(this.myValue, {this.otherValue}): assert(myValue > 0); // not `@Assert('...')` needed
```
```dart
MyClass(this.myValue) {
    date = DateTime.now(); // Non-const default values :)
    // other logic
}
```
Dealing with generics is easy, no need to use additional annotations like
```dart
@With
@Implements
 ```

At the end of the day, `dart_mappable` gives Dart developers all the abilities they usually choice `freezed` for without getting in their way.