const { InterfacePin } = require('jslogiccircuit');

class SlicePin extends InterfacePin {
    /**
     *
     * @param {*} name
     * @param {*} bitRange
     * @param {*} pin
     */
    constructor(name, bitRange, pin) {
        super(name, bitRange.getBitWidth())

        this.bitRange = bitRange;
        this.pin = pin;
    }

    setData(data) {
        let lastData = this.pin.getData(); // Binary 对象
        let modifiedData = lastData.splice(this.bitRange.bitLow, data);
        this.pin.setData(modifiedData);
    }

    getData() {
        let lastData = this.pin.getData(); // Binary 对象
        return lastData.slice(this.bitRange.bitLow, this.bitWidth);
    }
}

module.exports = SlicePin;