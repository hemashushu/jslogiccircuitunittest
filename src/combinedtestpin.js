const { Binary } = require('jsbinary');
const { Signal } = require('jslogiccircuit');

const AbstractTestPin = require('./abstracttestpin');

class CombinedTestPin extends AbstractTestPin {
    /**
     *
     * @param {*} name
     * @param {*} isInput
     * @param {*} childTestPins 从高位到低位排序的 Pin 对象集合
     */
    constructor(name, isInput, childTestPins) {
        super(name,
            CombinedTestPin.getPinsBitWidth(childTestPins),
            isInput);

        // - childTestPins: [AbstractPortItem, ...] 数组
        // - childTestPins 的顺序跟脚本书写的顺序一致，即先写
        //   的范围（高位）先加入数组（索引值较小），后写的（低位）后加入
        //   数组（索引值较大）。
        this.childTestPins = childTestPins;
    }

    setSignal(signal) {
        let offset = 0;

        let binary = signal.getBinary();
        for (let idx = this.childTestPins.length - 1; idx >= 0; idx--) {
            let testPin = this.childTestPins[idx];
            let partialBinary = binary.slice(offset, testPin.bitWidth);

            let signal = Signal.createWithoutHighZ(testPin.bitWidth, partialBinary);
            testPin.setSignal(signal);
            offset += testPin.bitWidth;
        }
    }

    getSignal() {
        let binary = Binary.fromBinaryString('0', this.bitWidth);
        let offset = 0;

        for (let idx = this.childTestPins.length - 1; idx >= 0; idx--) {
            let testPin = this.childTestPins[idx];
            let signal = testPin.getSignal();
            let partialBinary = signal.getBinary();
            binary = binary.splice(offset, partialBinary);
            offset += partialBinary.bitWidth;
        }

        return Signal.createWithoutHighZ(this.bitWidth, binary);
    }

    static getPinsBitWidth(testPins) {
        let bitWidth = 0;
        for (let testPin of testPins) {
            bitWidth += testPin.bitWidth;
        }
        return bitWidth;
    }
}

module.exports = CombinedTestPin;