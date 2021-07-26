const { AbstractWire } = require('jslogiccircuit');

class AbstractTestPin extends AbstractWire {
    constructor(name, bitWidth, isInput) {
        super();

        if (!(bitWidth >=1 && bitWidth <=32)) {
            throw new IllegalArgumentException('Bit width out of range.');
        }

        this.name = name;
        this.bitWidth = bitWidth;

        // 只有顶层模块的 input pin、以及 input pin 的切片、
        // input pin 的拼接才能作为测试输入端口。
        //
        // 顶层模块的 ouput pin、子层的 input pin 和 output pin，
        // 以及它们的切片，以及包含它们的拼接，都只能作为测试的输出
        // 端口。
        this.isInput = isInput;
    }
}

module.exports = AbstractTestPin;