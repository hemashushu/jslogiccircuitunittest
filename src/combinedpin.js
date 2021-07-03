const { InterfacePin } = require('jslogiccircuit');
const {Binary} = require('jsbinary');

class CombinedPin extends InterfacePin {
    /**
     *
     * @param {*} name
     * @param {*} pins 从高位到低位排序的 Pin 对象集合
     */
    constructor(name, pins) {
        super(name, CombinedPin.calculatePinsBitWidth(pins));
        this.pins = pins;
    }

    setData(data) {
        let offset = 0;
        for(let pin of this.pins) {
            let partialData = data.slice(offset, pin.bitWidth);
            pin.setData(partialData);
            offset += pin.bitWidth;
        }
    }

    getData() {
        let data = Binary.fromBinaryString('0', this.bitWidth);
        let offset = 0;
        for(let pin of this.pins) {
            let partialData = pin.getData();
            data = data.splice(offset, partialData);
            offset += partialData.bitWidth;
        }
        return data;
    }

    calculatePinsBitWidth(pins) {
        let bitWidth = 0;
        for(let pin of pins) {
            bitWidth += pin.bitWidth;
        }
        return bitWidth;
    }
}

module.exports = CombinedPin;