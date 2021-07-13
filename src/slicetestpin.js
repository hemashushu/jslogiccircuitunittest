const { Signal } = require('jslogiccircuit');

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
        let binary = signal.getBinary();

        let lastSignal = this._pin.getSignal();
        let lastBinary = lastSignal.getBinary();

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialBinary = binary.slice(offset, bitRange.getBitWidth());
            lastBinary = lastBinary.splice(bitRange.bitLow, partialBinary);
            offset += partialBinary.bitWidth;
        }

        let resultSignal = Signal.createWithoutHighZ(this.bitWidth, lastBinary);
        this._pin.setSignal(resultSignal);
    }

    getSignal() {
        let lastSignal = this._pin.getSignal();
        let lastBinary = lastSignal.getBinary();

        let binary = Binary.fromBinaryString('0', this.bitWidth);
        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialBinary = lastBinary.slice(bitRange.bitLow, bitRange.getBitWidth());
            binary = binary.splice(offset, partialBinary);
            offset += partialBinary.bitWidth;
        }

        return Signal.createWithoutHighZ(this.bitWidth, binary);
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