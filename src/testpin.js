const AbstractTestPin = require('./abstracttestpin');

class TestPin extends AbstractTestPin {
    constructor(name, isInput, pin) {
        super(name, pin.bitWidth, isInput);
        this._pin = pin;
    }

    setSignal(signal){
        this._pin.setSignal(signal);
    }

    getSignal() {
        return this._pin.getSignal();
    }
}

module.exports = TestPin;