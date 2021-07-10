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

    setData(data) {
        let lastData = this._pin.getData(); // Binary 对象

        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialData = data.slice(offset, bitRange.getBitWidth());
            lastData = lastData.splice(bitRange.bitLow, partialData);
            offset += partialData.bitWidth;
        }

        this._pin.setData(lastData);
    }

    getData() {
        let lastData = this._pin.getData(); // Binary 对象

        let data = Binary.fromBinaryString('0', this.bitWidth);
        let offset = 0;
        for (let idx = this.bitRanges.length - 1; idx >= 0; idx--) {
            let bitRange = this.bitRanges[idx];
            let partialData = lastData.slice(bitRange.bitLow, bitRange.getBitWidth());
            data = data.splice(offset, partialData);
            offset += partialData.bitWidth;
        }
        return data;
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