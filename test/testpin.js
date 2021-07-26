const { Binary } = require('jsbinary');
const { ObjectUtils } = require('jsobjectutils');
const { BitRange, Signal, Pin } = require('jslogiccircuit');
const { IllegalArgumentException } = require('jsexception');

const {
    TestPin,
    SliceTestPin,
    CombinedTestPin
} = require('../index');

const assert = require('assert/strict');

describe('TestPin test', () => {
    it('Test constructor', () => {
        let pin1 = new Pin('pin1', 8);
        let testPin1 = new TestPin('testPin1', true, pin1);

        assert.equal(testPin1.name, 'testPin1');
        assert.equal(testPin1.bitWidth, 8);
        assert.equal(testPin1.isInput, true);
    });

    it('Test get/set signal', () => {
        let pin1 = new Pin('pin1', 8);
        let testPin1 = new TestPin('testPin1', true, pin1);

        let signal1 = Signal.createHigh(8);
        testPin1.setSignal(signal1);
        assert(Signal.equal(testPin1.getSignal(), signal1));

        let signal2 = Signal.createLow(8);
        testPin1.setSignal(signal2);
        assert(Signal.equal(testPin1.getSignal(), signal2));
    });

    it('Test SliceTestPin', () => {
        let pin1 = new Pin('pin1', 8);

        let sliceTestPin1 = new SliceTestPin('sliceTestPin1', true,
            [new BitRange(7, 6), new BitRange(3, 0)], // 2 + 4 = 6 bits
            pin1);

        assert.equal(sliceTestPin1.name, 'sliceTestPin1');
        assert.equal(sliceTestPin1.bitWidth, 6);
        assert.equal(sliceTestPin1.isInput, true);

        // test set
        let signal1 = Signal.createHigh(8);
        sliceTestPin1.setSignal(signal1);

        let pinSignal1 = pin1.getSignal();
        let expectSignal1 = Signal.createWithoutHighZ(8, Binary.fromBinaryString('11001111'));
        assert(Signal.equal(pinSignal1, expectSignal1));

        // test get
        let pinSignal2 = Signal.createWithoutHighZ(8, Binary.fromBinaryString('10100101'));
        pin1.setSignal(pinSignal2);
        let signal2 = sliceTestPin1.getSignal();
        let expectSignal2 = Signal.createWithoutHighZ(6, Binary.fromBinaryString('100101'));
        assert(Signal.equal(signal2, expectSignal2));

        // test error
        try{
            new SliceTestPin('sliceTestPin2', true,
                [new BitRange(15,0)],
                pin1);
            assert.fail();
        }catch(err) {
            assert(err instanceof IllegalArgumentException);
        }
    });

    it('Test CombinedTestPin', () => {
        let pin1 = new Pin('pin1', 5);
        let pin2 = new Pin('pin2', 2);
        let pin3 = new Pin('pin3', 1);

        let testPin1 = new TestPin('testPin1', true, pin1);
        let testPin2 = new TestPin('testPin2', true, pin2);
        let testPin3 = new TestPin('testPin3', true, pin3);

        let combinedTestPin1 = new CombinedTestPin('combinedTestPin1', true,
            [testPin1, testPin2, testPin3]);

        assert.equal(combinedTestPin1.name, 'combinedTestPin1');
        assert.equal(combinedTestPin1.bitWidth, 8);
        assert.equal(combinedTestPin1.isInput, true);

        // test get
        let pinSignal1 = Signal.createHigh(5);
        let pinSignal2 = Signal.createHighZ(2);
        let pinSignal3 = Signal.createLow(1);

        testPin1.setSignal(pinSignal1);
        testPin2.setSignal(pinSignal2);
        testPin3.setSignal(pinSignal3);

        let signal1 = combinedTestPin1.getSignal();
        let expectSignal1 = Signal.create(8,
            Binary.fromBinaryString('11111000'),
            Binary.fromBinaryString('00000110'));
        assert(Signal.equal(signal1, expectSignal1));

        // test set
        let signal2 = Signal.createWithoutHighZ(8, Binary.fromBinaryString('10100011'));
        combinedTestPin1.setSignal(signal2);

        assert(Signal.equal(
            testPin1.getSignal(),
            Signal.createWithoutHighZ(5, Binary.fromBinaryString('10100'))));

        assert(Signal.equal(
            testPin2.getSignal(),
            Signal.createWithoutHighZ(2, Binary.fromBinaryString('01'))));

        assert(Signal.equal(
            testPin3.getSignal(),
            Signal.createWithoutHighZ(1, Binary.fromBinaryString('1'))));
    });
});