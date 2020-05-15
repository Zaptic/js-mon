import { assert, use } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Result } from './result'

use(chaiAsPromised)

function assertOk<T>(result: Result<unknown, T>, expectedValue: T) {
    assert.isTrue(result.isOk())
    result.map((value) => assert.deepEqual(value, expectedValue))
}

function assertErr<T>(result: Result<T, unknown>, expectedError: T) {
    assert.isTrue(result.isErr())
    result.mapErr((error) => assert.deepEqual(error, expectedError))
}

const add = (x: number) => (y: number) => x + y
const asyncAdd = (x: number) => (y: number) => Promise.resolve(x + y)

describe('The Result Monad', function () {
    it('type constructors should return the correct type', async function () {
        const ok = Result.ok('OK')
        assertOk(ok, 'OK')

        const err = Result.err('Err')
        assertErr(err, 'Err')

        const okInPromise = Result.asyncOk('Ok Promise')
        assert.instanceOf(okInPromise, Promise)
        assertOk(await okInPromise, 'Ok Promise')

        const errInPromise = Result.asyncErr('Err Promise')
        assert.instanceOf(errInPromise, Promise)
        assertErr(await errInPromise, 'Err Promise')

        const okFromPromise = Result.asyncOk(Promise.resolve('Ok from Promise'))
        assert.instanceOf(okFromPromise, Promise)
        assertOk(await okFromPromise, 'Ok from Promise')

        const errFromPromise = Result.asyncErr(Promise.resolve('Err from Promise'))
        assert.instanceOf(errFromPromise, Promise)
        assertErr(await errFromPromise, 'Err from Promise')
    })

    it('.map method should transform values correctly', function () {
        const shouldBe20 = Result.ok(12).map(add(-2)).map(add(10))
        const shouldBeErr = Result.err('Fail')
            .map(() => 0)
            .map(add(-2))
            .map(add(10))

        assertOk(shouldBe20, 20)
        assertErr(shouldBeErr, 'Fail')
    })

    it('.mapErr method should transform values correctly', function () {
        const shouldBeOk = Result.ok<number, number>(0).mapErr(add(-2)).mapErr(add(10))
        const shouldBeErr = Result.err(12)
            .mapErr(add(-2))
            .mapErr(() => 'Fail')

        assertOk(shouldBeOk, 0)
        assertErr(shouldBeErr, 'Fail')
    })

    it('.filter method should turn an OK into an Err only when the predicate returns false', function () {
        const ok = Result.ok(45)

        const shouldBeOk = ok.filter((n) => n > 20, 'Not greater than 20')
        const shouldBeErr = ok.filter((n) => n < 20, 'Not less than 20')

        assertOk(shouldBeOk, 45)
        assertErr(shouldBeErr, 'Not less than 20')

        // .filter cannot make an Err OK or change the value of the Err
        assertErr(
            shouldBeErr.filter(() => true, 'OK'),
            'Not less than 20'
        )
        assertErr(
            shouldBeErr.filter(() => false, 'OK'),
            'Not less than 20'
        )
    })

    it('.chain should return the result of the chained operation', function () {
        const ok = Result.ok('Some user data')

        const shouldRemainOk = ok
            .chain(() => Result.ok('Posts that the user has authored'))
            .chain(() => Result.ok('List of commenter'))

        const shouldBecomeErr = ok
            .chain(() => Result.err('Malformed query'))
            .chain(() => Result.ok('Once a result has become Err, it cannot be rescued'))
            .chain(() => Result.ok('The Err will skip these operations'))

        const shouldRemainErr = shouldBecomeErr
            .chain(() => Result.err('Since the chains are skipped, the Err cannot be superseded by another Err'))
            .chain(() => Result.err('An Err can be mapped over using .mapErr'))

        assertOk(shouldRemainOk, 'List of commenter')
        assertErr(shouldBecomeErr, 'Malformed query')
        assertErr(shouldRemainErr, 'Malformed query')
    })

    it('.orThrow should thow an Err when extracting a value from an Err', function () {
        const ok = Result.ok(50)
        const err = Result.err('Nothing here...')

        assert.equal(ok.orThrow('This should not throw'), 50)
        assert.equal(ok.orThrow(new TypeError('This should also not throw')), 50)

        assert.throws(() => err.orThrow('This will be wrapped in an Error'), Error)
        assert.throws(() => err.orThrow(new TypeError('This will be a Type Error')), TypeError)
    })

    it('.withDefault should return the correct value in the correct situation', function () {
        const ok = Result.ok<number, string>(20)
        const err = Result.err<string, number>('Err')

        assert.equal(ok.withDefault(40), 20)
        assert.equal(err.withDefault(40), 40)
    })
})

describe('The ResultPromise Monad', function () {
    it('.map method should transform values correctly', async function () {
        const shouldBe20 = Result.asyncOk(12).map(asyncAdd(-2)).map(add(10))
        const shouldBeErr = Result.asyncErr('Fail')
            .map(() => 0)
            .map(asyncAdd(-2))
            .map(add(10))

        assertOk(await shouldBe20, 20)
        assertErr(await shouldBeErr, 'Fail')
    })

    it('.mapErr method should transform values correctly', async function () {
        const shouldBe10 = Result.asyncErr(12).mapErr(add(-2))
        const shouldBeString = shouldBe10.mapErr(() => Promise.resolve('Fail'))
        const shouldBeOk = Result.asyncOk<number, number>(0).mapErr(add(-2)).mapErr(asyncAdd(10))

        assertErr(await shouldBe10, 10)
        assertOk(await shouldBeOk, 0)
        assertErr(await shouldBeString, 'Fail')
    })

    it('.filter method should turn an OK into an Err only when the predicate returns false', async function () {
        const ok = Result.asyncOk(45)

        const shouldBeOk = ok.filter((n) => n > 20, 'Not greater than 20')
        assertOk(await shouldBeOk, 45)

        const shouldAlsoBeOk = ok.filter((n) => Promise.resolve(n > 20), Promise.resolve('Not greater than 20'))
        assertOk(await shouldAlsoBeOk, 45)

        const shouldBeErr = ok.filter((n) => n < 20, 'Not less than 20')
        assertErr(await shouldBeErr, 'Not less than 20')

        assertErr(await shouldBeErr.filter(() => true, 'OK'), 'Not less than 20')
        assertErr(await shouldBeErr.filter(() => false, 'OK'), 'Not less than 20')

        const shouldAlsoBeErr = ok.filter((n) => Promise.resolve(n < 20), Promise.resolve('Not less than 20'))
        assertErr(await shouldAlsoBeErr, 'Not less than 20')

        assertErr(await shouldAlsoBeErr.filter(() => Promise.resolve(true), 'OK'), 'Not less than 20')
        assertErr(await shouldAlsoBeErr.filter(() => Promise.resolve(false), 'OK'), 'Not less than 20')
    })

    it('.chain should return the result of the chained operation', async function () {
        const ok = Result.asyncOk('Some user data')

        const shouldRemainOk = ok
            .chain(() => Result.ok('Posts that the user has authored'))
            .chain(() => Promise.resolve(Result.ok('List of commenters')))

        const shouldBecomeErr = ok
            .chain(() => Promise.resolve(Result.err('Malformed query')))
            .chain(() => Promise.resolve(Result.ok('Once a result has become Err, it cannot be rescued')))
            .chain(() => Result.ok('The Err will skip these operations'))

        const shouldRemainErr = shouldBecomeErr
            .chain(() => Result.err('Since the chains are skipped, the Err cannot be superceeded by another Err'))
            .chain(() => Promise.resolve(Result.err('An Err can be mapped over using .mapErr')))

        assertOk(await shouldRemainOk, 'List of commenters')
        assertErr(await shouldBecomeErr, 'Malformed query')
        assertErr(await shouldRemainErr, 'Malformed query')
    })

    it('.mapErr should propagate thrown errors', async function () {
        const ok = Result.asyncErr('Some user data')

        const shouldThrow = ok.mapErr(() => {
            throw new Error('Test')
        })

        await assert.isRejected(shouldThrow, 'Test')
    })

    it('.orThrow should reject an Err when extracting a value from an Err', async function () {
        const ok = Result.asyncOk<number, string>(50)
        const err = Result.asyncErr<string, number>('Nothing here...')

        assert.equal(await ok.orThrow('This should not throw'), 50)
        assert.equal(await ok.orThrow(new TypeError('This should also not throw')), 50)

        await assert.isRejected(err.orThrow('This will be wrapped in an Error'))
        await assert.isRejected(err.orThrow(new TypeError('This will be a Type Error')))
    })

    it('.withDefault should return the correct value in the correct situation', async function () {
        const ok = Result.asyncOk<number, string>(20)
        const err = Result.asyncErr<string, number>('Err')

        assert.equal(await ok.withDefault(40), 20)
        assert.equal(await ok.withDefault(Promise.resolve(40)), 20)
        assert.equal(await err.withDefault(40), 40)
        assert.equal(await err.withDefault(Promise.resolve(40)), 40)
    })
})
