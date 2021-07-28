const { SimpleLogicModule, Signal, PinDirection } = require('jslogiccircuit');
const { Binary } = require('jsbinary');

/**
 * 逻辑与非门
 */
class NandGate extends SimpleLogicModule {

    // override
    init() {
        // 输入端口的数量
        this._inputPinCount = this.getParameter('inputPinCount');

        // 数据宽度
        this._bitWidth = this.getParameter('bitWidth');

        this._pinOut = this.addPin('out', this._bitWidth, PinDirection.output);

        // 输入端口的名称分别为 in_0, in_1, ... inN
        for (let idx = 0; idx < this._inputPinCount; idx++) {
            this.addPin('in_' + idx, this._bitWidth, PinDirection.input);
        }
    }

    // override
    updateModuleState() {
        let states = this.inputPins.map(pin => {
            return pin.getSignal().getState();
        });

        let state = states[0];
        let resultBinary = Binary.and(state.binary, Binary.not(state.highZ));

        for (let idx = 1; idx < states.length; idx++) {
            state = states[idx];
            let currentBinary = Binary.and(state.binary, Binary.not(state.highZ));
            resultBinary = Binary.and(resultBinary, currentBinary);
        }

        resultBinary = Binary.not(resultBinary);
        let resultSignal = Signal.createWithoutHighZ(this._bitWidth, resultBinary);

        this._pinOut.setSignal(resultSignal);
    }
}


module.exports = NandGate;