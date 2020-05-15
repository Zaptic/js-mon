import { assert } from 'chai'
import { MaybePromise, Maybe } from './maybe'

function add1(value: number) {
    return value + 1
}

function divide5By(value: number): Maybe<number> {
    if (value === 0) return Maybe.nothing()
    return Maybe.just(5 / value)
}

function failsIfExecuted(): never {
    throw new Error('This should not be executed')
}

describe('The Maybe monad', function () {
    describe('fromOptional constructor', function () {
        it('should return a Just if the value given is not null or undefined', function () {
            const maybe = Maybe.fromOptional(1)
            assert.deepEqual(maybe, Maybe.just(1))
        })

        it('should return a Nothing if the value given is null', function () {
            const maybe = Maybe.fromOptional(null)
            assert.isTrue(maybe.isNothing())
        })

        it('should return a Nothing if the value given is undefined', function () {
            const maybe = Maybe.fromOptional(undefined)
            assert.isTrue(maybe.isNothing())
        })
    })

    describe('isMaybe function', function () {
        it('should return true if the value given is a maybe', function () {
            assert.isTrue(Maybe.isMaybe(Maybe.just(1)))
            assert.isTrue(Maybe.isMaybe(Maybe.nothing()))
        })

        it('should return false if the value given is not a maybe', function () {
            assert.isFalse(Maybe.isMaybe(1))
            assert.isFalse(Maybe.isMaybe('test'))
            assert.isFalse(Maybe.isMaybe(undefined))
            assert.isFalse(Maybe.isMaybe(null))
            assert.isFalse(Maybe.isMaybe(false))
            assert.isFalse(Maybe.isMaybe({}))
        })
    })

    describe('isJust method', function () {
        it('should return true if the maybe has a value', function () {
            const maybe = Maybe.just(false)
            assert.isTrue(maybe.isJust())
        })

        it('should return false if the maybe does not have a value', function () {
            const maybe = Maybe.nothing()
            assert.isFalse(maybe.isJust())
        })
    })

    describe('isNothing method', function () {
        it('should return false if the maybe has a value', function () {
            const maybe = Maybe.just(false)
            assert.isFalse(maybe.isNothing())
        })

        it('should return true if the maybe does not have a value', function () {
            const maybe = Maybe.nothing()
            assert.isTrue(maybe.isNothing())
        })
    })

    describe('orThrow method', function () {
        it('should return the value if the maybe has a value', function () {
            const maybe = Maybe.just(1)
            assert.equal(maybe.orThrow(), 1)
        })

        it('should throw an error if the maybe does not have a value', function () {
            const maybe = Maybe.nothing()
            assert.throws(() => maybe.orThrow(), 'Attempted to extract a value from a Nothing')
        })
    })

    describe('withDefault method', function () {
        it('should return the original maybe if it already has a value', function () {
            const maybe = Maybe.just(1)
            assert.deepEqual(maybe.withDefault(2), 1)
        })

        it('should return a maybe with the given value', function () {
            const maybe = Maybe.nothing()
            assert.equal(maybe.withDefault(1), 1)
        })
    })

    describe('map method', function () {
        it('should apply the given function to the value in the maybe', function () {
            const maybe = Maybe.just(1)
            assert.deepEqual(maybe.map(add1), Maybe.just(2))
        })

        it('should return the same maybe if it does not have a value', function () {
            const maybe = Maybe.nothing<number>()
            assert.deepEqual(maybe.map(add1), maybe)
        })
    })

    describe('filter method', function () {
        it('should return the same value if the condition passed is verified', function () {
            const maybe = Maybe.just(1)
            assert.deepEqual(
                maybe.filter((n) => n === 1),
                Maybe.just(1)
            )
        })

        it('should return nothing if the condition is not verified', function () {
            const maybe = Maybe.just(1)
            assert.deepEqual(
                maybe.filter((n) => n === 2),
                Maybe.nothing()
            )
        })

        it('should not execute the function if called on nothing', function () {
            const maybe = Maybe.nothing()
            assert.deepEqual(maybe.filter(failsIfExecuted), Maybe.nothing())
        })
    })

    describe('chain method', function () {
        it('should apply the given function to the value in the maybe', function () {
            const maybe5 = Maybe.just(5)
            const maybe0 = Maybe.just(0)

            assert.deepEqual(maybe5.chain(divide5By), Maybe.just(1))
            assert.deepEqual(maybe0.chain(divide5By), Maybe.nothing())
        })

        it('should return the same maybe if it does not have a value', function () {
            const maybe = Maybe.nothing<number>()
            assert.deepEqual(maybe.chain(divide5By), maybe)
        })
    })

    describe('toResult method', function () {
        it('should convert a maybe with a value to an Ok result', function () {
            const result = Maybe.just(1).toResult('Error')
            assert.isTrue(result.isOk())
            result.map((value) => assert.deepEqual(value, 1))
        })

        it('should convert a maybe without a value to Err result', function () {
            const result = Maybe.nothing().toResult('Error')
            assert.isTrue(result.isErr())
            result.mapErr((value) => assert.deepEqual(value, 'Error'))
        })
    })
})

describe('The MaybePromise monad', function () {
    describe('constructor', function () {
        it('should build an AsyncMaybe from a Promise of Maybe and reflect its value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            // After being resolved the value is correct
            assert.deepEqual(await maybe, Maybe.just(1))
        })

        it('should build an AsyncMaybe from a Promise of Maybe reflect its lack of value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            // After being resolved the value is correct
            assert.deepEqual(await maybe, Maybe.nothing())
        })

        it('should propagate errors', async function () {
            const maybePromise = new Promise<Maybe<number>>((_, reject) => reject('Error'))

            const maybe = MaybePromise.from(maybePromise)

            // After being resolved the error is propagated
            return assert.isRejected(maybe, 'Error')
        })
    })

    describe('isJust method', function () {
        it('should return true if the maybe has a value', async function () {
            const maybePromise = new Promise<Maybe<boolean>>((resolve) => resolve(Maybe.just(false)))
            const maybe = MaybePromise.from(maybePromise)

            assert.isTrue(await maybe.isJust())
        })

        it('should return false if the maybe does not have a value', async function () {
            const maybePromise = new Promise<Maybe<boolean>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.isFalse(await maybe.isJust())
        })
    })

    describe('isNothing method', function () {
        it('should return false if the maybe has a value', async function () {
            const maybePromise = new Promise<Maybe<boolean>>((resolve) => resolve(Maybe.just(false)))
            const maybe = MaybePromise.from(maybePromise)

            assert.isFalse(await maybe.isNothing())
        })

        it('should return true if the maybe does not have a value', async function () {
            const maybePromise = new Promise<Maybe<boolean>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.isTrue(await maybe.isNothing())
        })
    })

    describe('orThrow method', function () {
        it('should return the value if the maybe has a value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.equal(await maybe.orThrow(), 1)
        })

        it('should throw an error if the maybe does not have a value', function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.isRejected(maybe.orThrow(), 'Attempted to extract a value from a Nothing')
        })
    })

    describe('withDefault method', function () {
        const promise2 = new Promise<number>((resolve) => resolve(2))

        it('should return the original maybe if it already has a value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.withDefault(promise2), 1)
        })

        it('should return a maybe with the given value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.equal(await maybe.withDefault(promise2), 2)
        })
    })

    describe('orElseDo method', function () {
        const promise2 = new Promise<number>((resolve) => resolve(2))

        it('should return the original maybe if it already has a value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.orElseDo(() => promise2), 1)
        })

        it('should return a maybe with the given value without executing the value function', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.equal(await maybe.orElseDo(failsIfExecuted), 1)
        })
    })

    describe('map method', function () {
        function asyncAdd1(value: number) {
            return new Promise((resolve) => resolve(add1(value)))
        }

        it('should apply the given function to the value in the maybe', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.map(add1), Maybe.just(2))
            assert.deepEqual(await maybe.map(asyncAdd1), Maybe.just(2))
        })

        it('should return the same maybe if it does not have a value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.map(asyncAdd1), Maybe.nothing())
        })
    })

    describe('filter method', function () {
        function asyncEquals1(n: number) {
            return new Promise<boolean>((resolve) => resolve(n === 1))
        }

        it('should return the same value if the condition passed is verified', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.filter(asyncEquals1), Maybe.just(1))
        })

        it('should return nothing if the condition is not verified', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(2)))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.filter(asyncEquals1), Maybe.nothing())
        })

        it('should not execute the function if called on nothing', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.filter(failsIfExecuted), Maybe.nothing())
        })
    })

    describe('chain method', function () {
        function asyncDivide5By(value: number) {
            return new Promise<Maybe<number>>((resolve) => resolve(divide5By(value)))
        }

        it('should apply the given function to the value in the maybe', async function () {
            const maybePromise5 = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(5)))
            const maybe5 = MaybePromise.from(maybePromise5)
            const maybePromise0 = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(0)))
            const maybe0 = MaybePromise.from(maybePromise0)

            assert.deepEqual(await maybe5.chain(asyncDivide5By), Maybe.just(1))
            assert.deepEqual(await maybe5.chain(divide5By), Maybe.just(1))
            assert.deepEqual(await maybe0.chain(asyncDivide5By), Maybe.nothing())
            assert.deepEqual(await maybe0.chain(divide5By), Maybe.nothing())
        })

        it('should return the same maybe if it does not have a value', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)

            assert.deepEqual(await maybe.chain(asyncDivide5By), Maybe.nothing())
            assert.deepEqual(await maybe.chain(divide5By), Maybe.nothing())
        })
    })

    describe('toResult method', function () {
        it('should convert a maybe with a value to an Ok result', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.just(1)))
            const maybe = MaybePromise.from(maybePromise)
            const result = await maybe.toResult('Error')

            assert.isTrue(result.isOk())
            result.map((value) => assert.deepEqual(value, 1))
        })

        it('should convert a maybe without a value to Err result', async function () {
            const maybePromise = new Promise<Maybe<number>>((resolve) => resolve(Maybe.nothing()))
            const maybe = MaybePromise.from(maybePromise)
            const result = await maybe.toResult('Error')

            assert.isTrue(result.isErr())
            result.mapErr((value) => assert.deepEqual(value, 'Error'))
        })
    })
})
