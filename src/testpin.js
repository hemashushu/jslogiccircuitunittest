const AbstractTestPin = require('./abstracttestpin');

class TestPin extends AbstractTestPin {
    constructor(name, isInput, pin) {
        super(name, pin.bitWidth, isInput);
        this._pin = pin;
    }

    setData(data){
        this._pin.setData(data);
    }

    getData() {
        return this._pin.getData();
    }
}

module.exports = TestPin;