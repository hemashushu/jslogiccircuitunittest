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

        let {binary, highZ} = signal.getState();

        for (let idx = this.childTestPins.length - 1; idx >= 0; idx--) {
            let childTestPin = this.childTestPins[idx];
            let partialBinary = binary.slice(offset, childTestPin.bitWidth);
            let partialHighZ = highZ.slice(offset, childTestPin.bitWidth);

            let signal = Signal.create(childTestPin.bitWidth, partialBinary, partialHighZ);
            childTestPin.setSignal(signal);
            offset += childTestPin.bitWidth;
        }
    }

    getSignal() {
        let binary = Binary.fromInt32(0, this.bitWidth);
        let highZ = Binary.fromInt32(0, this.bitWidth);

        let offset = 0;

        for (let idx = this.childTestPins.length - 1; idx >= 0; idx--) {
            let childTestPin = this.childTestPins[idx];
            let state = childTestPin.getSignal().getState();

            binary = binary.splice(offset, state.binary);
            highZ = highZ.splice(offset, state.highZ);

            offset += childTestPin.bitWidth;
        }

        return Signal.create(this.bitWidth, binary, highZ);
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