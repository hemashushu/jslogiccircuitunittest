const { Signal } = require('jslogiccircuit');
const { Binary } = require('jsbinary');
const { IllegalArgumentException } = require('jsexception');

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

        for (let bitRange of bitRanges) {
            if (bitRange.bitHigh > pin.bitWidth ||
                bitRange.bitLow < 0) {
                throw new IllegalArgumentException(
                    `Invalid slice bit range [${bitRange.bitHigh}:${bitRange.bitLow}] for pin: ${pin.name}[${pin.bitWidth}].`);
            }
        }

        this.bitRanges = bitRanges;
        this._pin = pin;
    }

    setSignal(signal) {
        let {level, highZ} = signal.getState();

        let lastState = this._pin.getSignal().getState();
        let lastBinary = lastState.level;
        let lastHighZ = lastState.highZ;

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialLevel = level.slice(offset, bitRange.getBitWidth());
            let partialHighZ = highZ.slice(offset, bitRange.getBitWidth());

            lastBinary = lastBinary.splice(bitRange.bitLow, partialLevel);
            lastHighZ = lastHighZ.splice(bitRange.bitLow, partialHighZ);

            offset += partialLevel.bitWidth;
        }

        let resultSignal = Signal.create(this.bitWidth, lastBinary, lastHighZ);
        this._pin.setSignal(resultSignal);
    }

    getSignal() {
        let lastState = this._pin.getSignal().getState();
        let lastBinary = lastState.level;
        let lastHighZ = lastState.highZ;

        let level = Binary.fromInt32(0, this.bitWidth);
        let highZ = Binary.fromInt32(0, this.bitWidth);

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];

            let partialLevel = lastBinary.slice(bitRange.bitLow, bitRange.getBitWidth());
            let partialHighZ = lastHighZ.slice(bitRange.bitLow, bitRange.getBitWidth());

            level = level.splice(offset, partialLevel);
            highZ = highZ.splice(offset, partialHighZ);

            offset += partialLevel.bitWidth;
        }

        return Signal.create(this.bitWidth, level, highZ);
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