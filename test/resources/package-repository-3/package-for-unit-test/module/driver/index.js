const { Signal, PinDirection, SimpleLogicModule } = require('jslogiccircuit');
const { Binary} = require('jsbinary');

class Driver extends SimpleLogicModule {

    // override
    init() {
        // 模块参数
        let bitWidth = this.getParameter('bitWidth'); // 数据宽度

        // 输入端口
        this.pinIn = this.addPin('in', bitWidth, PinDirection.input);
        this.pinSelect = this.addPin('select', 1, PinDirection.input);

        // 输出端口
        this.pinOut = this.addPin('out', bitWidth, PinDirection.output);

        // 创建一些常量
        this.signalHigh = Signal.createHigh(1);
        this.signalHighZ = Signal.createHighZ(bitWidth);
    }

    // override
    updateModuleState() {
        if(Signal.equal(this.pinSelect.getSignal(), this.signalHigh)){
            this.pinOut.setSignal(this.pinIn.getSignal());
        }else {
            this.pinOut.setSignal(this.signalHighZ);
        }
    }
}

module.exports = Driver;