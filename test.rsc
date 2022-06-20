func fibonacci(n: Number) -> Number {
    let n = n
    if n < 2 {
        return n
    } else {
        return fibonacci(n - 1) + fibonacci(n - 2)
    }
}

println(fib_native(30))