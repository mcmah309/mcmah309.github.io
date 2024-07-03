# Should You Really Ever Use ArrayVec or SmallVec or TinyVec As Your Go To Vec?

## Definitions

**ArrayVec:** This is a vector-like structure with a fixed maximum capacity. Unlike a regular array, its actual size can change dynamically at runtime, accommodating a variable number of elements up to its capacity. The memory for elements is initialized upon insertion. This makes `ArrayVec` suitable for situations where you need more flexibility than a regular array but with a predictable, fixed maximum size.

**SmallVec:** `SmallVec` acts like a vector, storing its items on the stack up to a predefined limit. If this limit is exceeded, it transitions to heap storage. This design is ideal when you have a "soft" upper size limit - cases where the collection rarely exceeds a certain size, but you want to avoid program failure if it does. It's less optimal than a regular array or a `Vec` when used by itself outside this scenario.

**TinyVec:** This is a hybrid of `ArrayVec` and a heap-allocated `Vec`. Like `SmallVec`, it transitions from stack to heap storage when a limit is exceeded. However, TinyVec is distinct in that it avoids using "unsafe" code, potentially increasing safety. A limitation is that types stored in `TinyVec` must implement the Default trait.

## Discussion

For all these "vector on the stack" types, careful consideration is crucial. Generally, they should be used for small collections (significantly less than the 1-2 MB typical stack size limit) to prevent stack overflow. Additionally, while these structures can be returned from functions, this actually might
make these structures less performant. This is because compiler optimizations may invoke a "stack copy" when returning the value or passing the value to a function. Therefore, these should be primarily used within a single function's scope and avoided in scenarios where large or unpredictable sizes are expected. Also each of these structures now have an extra branch (e.g. `.is_on_stack()`) for operations such as `.push()`.

That said, the primary optimization to be made for vectors is not actually keeping them on the stack, it is avoiding re-allocations.
The better strategy is to simply reuse a regular `Vec` between invocations - create it once, then use it, call `.clear()` on it and repeat. That way you get no additional allocations and no overhead on `.push()` or passing it around.

The real use case for `SmallVec` and such is making a collection of them, such as `Vec<SmallVec>` (or more realistically `BTreeSet<MyStruct>` where `MyStruct` contains a `SmallVec` inside) to optimize for cache locality. Loads from RAM are slow compared to the speed of the CPU, so putting the data closer together minimizes the amount of loads.

## Conclusion

Using any of these types is likely a premature optimization and the standard `Vec` should usually be preferred, unless the code is performance critical and previously mentioned bounds hold.