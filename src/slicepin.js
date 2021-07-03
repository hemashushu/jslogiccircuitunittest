const { InterfacePin } = require('jslogiccircuit');

class SlicePin extends InterfacePin {
    /**
     *
     * @param {*} name
     * @param {*} bitHigh 位范围的高位
     *     比如某个 pin 的位宽为 16, 需要获取 [12:8] 范围的数据
     *     （即从第 8 位到第 12 位之间的数据，第 8 位和第 12 位皆包括），
     *     则 bitHigh 传入 12，bitLow 传入 8。
     * @param {*} bitLow 位范围的低位
     * @param {*} pin
     */
    constructor(name, bitHigh, bitLow, pin) {
        super(name, (bitHigh - bitLow + 1))

        // this.bitHigh = bitHigh;
        this.bitLow = bitLow;
        this.pin = pin;
    }

    setData(data) {
        let lastData = this.pin.getData(); // Binary 对象
        let modifiedData = lastData.splice(this.bitLow, data);
        this.pin.setData(modifiedData);
    }

    getData() {
        let lastData = this.pin.getData(); // Binary 对象
        return lastData.slice(this.bitLow, this.bitWidth);
    }
}

module.exports = SlicePin;