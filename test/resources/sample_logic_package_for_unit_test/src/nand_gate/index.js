const { AbstractLogicModule } = require('jslogiccircuit');
const { Binary } = require('jsbinary');

/**
 * 逻辑与非门
 */
class NandGate extends AbstractLogicModule {

    constructor(name, instanceParameters, defaultParameters) {
        super(name, instanceParameters, defaultParameters);
        this.init();
    }

    init() {
        // 模块参数
        let inputPinCount = this.getParameter('inputPinCount'); // 输入端口的数量
        let bitWidth = this.getParameter('bitWidth'); // 数据宽度

        this.addOutputPinByDetail('out', bitWidth);

        // 输入端口的名称分别为 in0, in1, ... inN
        let createInputPin = (idx) => {
            this.addInputPinByDetail('in' + idx, bitWidth);
        };

        // 输入端口
        for (let idx = 0; idx < inputPinCount; idx++) {
            createInputPin(idx);
        }
    }

    getPackageName() {
        return 'sample_logic_package_for_unit_test'; // 同目录名
    }

    getModuleClassName() {
        return 'nand_gate'; // 同目录名
    }

    // override
    updateModuleDataAndOutputPinsData() {
        let datas = this.inputPins.map(pin=>{
            return pin.getData();
        });

        let resultData = datas[0];
        for (let idx = 1; idx < datas.length; idx++) {
            resultData = Binary.and(resultData, datas[idx]);
        }

        resultData = Binary.not(resultData);

        this.outputPins[0].setData(resultData);
    }
}


module.exports = NandGate;