const { Signal } = require('jslogiccircuit');
const { Binary } = require('jsbinary');

const AbstractTestPin = require('./abstracttestpin');

class SliceTestPin extends AbstractTestPin {
    /**
     *
     * @param {*} name
     * @param {*} isInput
     * @param {*} bitRanges
     * @param {*} pin
     */
    constructor(name, isInput, bitRanges, pin) {
        super(name,
            SliceTestPin.getBitRangesBitWidth(bitRanges),
            isInput);

        // - ranges: [{bitHigh, bitLow}, ...] 数组
        // - ranges 的顺序跟脚本书写的顺序一致，即先写的
        //   范围（高位）先加入数组（索引值较小），后写的（低位）后加入
        //   数组（索引值较大）。

        this.bitRanges = bitRanges;
        this._pin = pin;
    }

    setSignal(signal) {
        let {binary, highZ} = signal.getState();

        let lastState = this._pin.getSignal().getState();
        let lastBinary = lastState.binary;
        let lastHighZ = lastState.highZ;

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialBinary = binary.slice(offset, bitRange.getBitWidth());
            let partialHighZ = highZ.slice(offset, bitRange.getBitWidth());

            lastBinary = lastBinary.splice(bitRange.bitLow, partialBinary);
            lastHighZ = lastHighZ.splice(bitRange.bitLow, partialHighZ);

            offset += partialBinary.bitWidth;
        }

        let resultSignal = Signal.create(this.bitWidth, lastBinary, lastHighZ);
        this._pin.setSignal(resultSignal);
    }

    getSignal() {
        let lastState = this._pin.getSignal().getState();
        let lastBinary = lastState.binary;
        let lastHighZ = lastState.highZ;

        let binary = Binary.fromInt32(0, this.bitWidth);
        let highZ = Binary.fromInt32(0, this.bitWidth);

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];

            let partialBinary = lastBinary.slice(bitRange.bitLow, bitRange.getBitWidth());
            let partialHighZ = lastHighZ.slice(bitRange.bitLow, bitRange.getBitWidth());

            binary = binary.splice(offset, partialBinary);
            highZ = highZ.splice(offset, partialHighZ);

            offset += partialBinary.bitWidth;
        }

        return Signal.create(this.bitWidth, binary, highZ);
    }

    static getBitRangesBitWidth(bitRanges) {
        let bitWidth = 0;
        for (let bitRange of bitRanges) {
            bitWidth += bitRange.getBitWidth();
        }
        return bitWidth;
    }
}

module.exports = SliceTestPin;