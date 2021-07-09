const { ParseException } = require('jsexception');
const {Binary} = require('jsbinary');

const {VariableCalculator} = require('jsvariablecalculator');

const { AbstractLogicModule,
    ModuleController,
    LogicModuleFactory } = require('jslogiccircuit');

const {PortItem,
    SlicePortItem,
    CombinedPortItem} = require('./portitem');

const TestPin = require('./testpin');
const SliceTestPin = require('./slicetestpin');
const CombinedTestPin = require('./combinedtestpin');

const DataRowItemType = require('./datarowitemtype');
const DataCellItem = require('./datacellitem');
const DataCellItemType = require('./datacellitemtype');
const TestResult = require('./testresult');

class UnitTestController {
    /**
     * 构造测试控制器
     *
     * - 需要先把待测试模块的逻辑包（及其逻辑模块）加载
     * - 如果端口列表指定的端口或者子模块找不到，则抛出 ParseException 异常。
     *
     * @param {*} packageName
     * @param {*} moduleClassName
     * @param {*} scriptItem
     */
    constructor(packageName, moduleClassName, scriptItem) {
        this.scriptName = scriptItem.name;
        this.dataRowItems = scriptItem.dataRowItems;

        // 获取测试脚本的头信息（Front-Matter）
        let frontMatter = scriptItem.frontMatter;

        // 时序模式标记
        this.seqMode = (frontMatter['!seq'] === true);

        // 构造模块测试参数
        let parameters = {};
        for(let key in frontMatter) {
            if (key.startsWith('!')){
                continue;
            }

            parameters[key] = frontMatter[key];
        }

        let logicModule = LogicModuleFactory.createModuleInstance(
            packageName, moduleClassName, 'logicModule1', parameters);

        // 构造端口读写列表
        this.testPins = this.generateTestPins(logicModule, scriptItem.portItems);

        // 模块控制器（运行器）
        this.moduleController = new ModuleController(logicModule);
    }

    /**
     *
     * @param {*} logicModule
     * @param {*} portItems
     * @returns AbstractTestPin 对象数组，如果端口列表指定的
     *     端口或者子模块找不到，则抛出 ParseException 异常。
     */
    generateTestPins(logicModule, portItems) {
        let testPins = [];
        for(let portItem of portItems) {
            testPins.push(this.generateTestPin(logicModule, portItem));
        }
        return testPins;
    }

    generateTestPin(logicModule, portItem) {
        if(portItem instanceof PortItem){
            return this.convertToTestPin(logicModule, portItem);
        }else if(portItem instanceof SlicePortItem) {
            return this.convertToSliceTestPin(logicModule, portItem);
        }else {
            return this.convertToCombinedTestPin(logicModule, portItem);
        }
    }

    convertToTestPin(logicModule, portItem) {
        let {pin, canTestInput} = this.getPinByNamePath(logicModule, portItem.namePath);
        let title = portItem.getTitle();
        return new TestPin(title, canTestInput, pin);
    }

    convertToSliceTestPin(logicModule, slicePortItem) {
        let {pin, canTestInput} = this.getPinByNamePath(logicModule, slicePortItem.namePath);
        let title = slicePortItem.getTitle();
        return new SliceTestPin(title, canTestInput, slicePortItem.bitRanges, pin);
    }

    convertToCombinedTestPin(logicModule, combinedPortItem) {
        let childTestPins = [];
        for(let portItem of combinedPortItem.childPortItems) {
            if (portItem instanceof PortItem) {
                childTestPins.push(this.convertToTestPin(logicModule, portItem));
            }else {
                childTestPins.push(this.convertToSliceTestPin(logicModule, portItem));
            }
        }

        let canTestInput = true;
        for(let testPin of childTestPins) {
            if (testPin.isInput === false) {
                canTestInput = false;
            }
        }

        let title = combinedPortItem.getTitle();
        return new CombinedTestPin(title, canTestInput, childTestPins);
    }

    /**
     *
     * @param {*} logicModule
     * @param {*} namePath
     * @returns {pin:Pin, canTestInput:Boolean} 对象，如果端口列表指定的
     *     端口或者子模块找不到，则抛出 ParseException 异常。
     */
    getPinByNamePath(logicModule, namePath) {
        let canTestInput = true;

        // namePath 是端口的名称路径，可能的值：
        // 1. 'pin_name', 单端口名称
        // 2. 'module_name.pin_name'，带子模块的端口名称
        // 3. 'm.m.pin_name'，带多层子模块的端口名称

        let names = namePath.split('.');

        // 子模块的端口只能用于输出测试
        if (names.length > 1) {
            canTestInput = false;
        }

        let targetLogicModule = logicModule;
        for(let idx=0;idx<names.length - 1;idx++) {
            let logicModuleName = names[idx];
            targetLogicModule = targetLogicModule.getLogicModule(logicModuleName);
            if (targetLogicModule === undefined){
                throw new ParseException('Can not found the module: ' + logicModuleName);
            }
        }

        let pinName = names[names.length - 1];

        let pin = targetLogicModule.getInputPin(pinName);
        if (pin !== undefined) {
            return {
                pin: pin,
                canTestInput: canTestInput
            };
        }

        // 输出端口只能用于输出测试（当然了）
        canTestInput = false;
        pin = targetLogicModule.getOutputPin(pinName);
        if (pin !== undefined) {
            return {
                pin: pin,
                canTestInput: canTestInput
            };
        }

        throw new ParseException('Can not found the port: ' + namePath);
    }


    /**
     *
     * - 如果模块存在振荡，则抛出 OscillatingException 异常。
     * - 如果测试脚本存在错误（一般语法错误在加载脚本时已经检测，这里一般是因为
     *   算术表达式引起的错误），则返回 {pass: false, lineIdx: Number}
     *
     * @returns {pass, lineIdx}，
     *     - 如果测试通过，则返回 {pass: true}，
     *     - 如果测试不通过，则返回 {pass: false,
     *           lineIdx: Number, portName: String,
     *           expect: Binary, actual: Binary}
     */

    test() {
        let variableContext = {};
        let groupTestResult = this.testDataRowItems(
            this.dataRowItems, variableContext, undefined, 0,0);

        return groupTestResult;
    }

    testDataRowItems(dataRowItems, variableContext, variableName, fromValue, toValue) {
        for(let value=fromValue; value<=toValue; value++){
            if (variableName !== undefined) {
                // 并不是所有的组都有变量
                variableContext[variableName] = value;
            }

            for(let idx=0; idx<dataRowItems.length; idx++) {
                let dataRowItem = dataRowItems[idx];
                let lineIdx = dataRowItem.lineIdx;

                if (dataRowItem.type === DataRowItemType.data) {
                    // 数据测试

                    let dataCellItems = dataRowItem.dataCellItems;

                    // 1. 设置输入数据
                    for(let column = 0; column < this.testPins.length; column++) {
                        let testPin = this.testPins[column];
                        if (!testPin.isInput) {
                            continue;
                        }

                        let dataCellItem = dataCellItems[column];
                        let data = UnitTestController.convertCellDataToBinary(
                            dataCellItem.type, dataCellItem.data, testPin.bitWidth,
                            lineIdx, variableContext);

                        if (data === undefined) {
                            throw new ParseException(
                                'Can not set value "x" to input, port: ' + testPin.name +
                                ', at line: ' + (lineIdx + 1));
                        }

                        testPin.setData(data);
                    }

                    // 2. 更新模块状态
                    this.moduleController.step();

                    // 3. 检验输出数据
                    for(let column = 0; column < this.testPins.length; column++) {
                        let testPin = this.testPins[column];
                        if (testPin.isInput) {
                            continue;
                        }
                        let dataCellItem = dataCellItems[column];
                        let expectData = UnitTestController.convertCellDataToBinary(
                            dataCellItem.type, dataCellItem.data, testPin.bitWidth,
                            lineIdx, variableContext);

                        // 单元数据是一个星号
                        if (expectData === undefined) {
                            continue;
                        }

                        let actualData = testPin.getData();

                        if (!Binary.equal(actualData, expectData)) {
                            return new TestResult(false,
                                lineIdx, testPin.name,
                                actualData, expectData);
                        }
                    }

                    // 4. 如果是时序模式，则空更新一次模块状态（模块一般
                    //    连接了时钟信号）
                    if (this.seqMode === true) {
                        this.moduleController.step();
                    }

                }else if (dataRowItem.type === DataRowItemType.nop) {
                    // 空转一次
                    if (this.seqMode === true) {
                        this.moduleController.step();
                        this.moduleController.step();
                    }else {
                        this.moduleController.step();
                    }

                }else {
                    // 新的组
                    let groupTestResult = this.testDataRowItems(
                        dataRowItem.childDataRowItems,
                        variableContext,
                        dataRowItem.variableName,
                        dataRowItem.from,
                        dataRowItem.to
                    );

                    if (groupTestResult.pass !== true) {
                        // 组测试不通过，跳过剩余的测试过程
                        return groupTestResult;
                    }
                }
            }
        }

        return new TestResult(true); // pass
    }

    static convertStringToBinary(text, bitWidth) {

        // 先把 String 转换为 UInt8Array

        // Buffer instances are also JavaScript Uint8Array and TypedArray instances
        // https://nodejs.org/api/buffer.html#buffer_buffers_and_typedarrays
        //
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
        let buffer = Buffer.from(text, 'utf8');
        let uint8Array = Uint8Array.from(buffer);

        // 再把 UInt8Array 转换为 Binary

        // index high ---v    v-- index low
        // string:      "high-low"
        // uint8 array: 'h-i-g-h-l-o-w'

        let data = Binary.fromBinaryString('0', bitWidth);
        let bytes = Math.ceil(bitWidth / 4);
        let count = uint8Array.length; //byteLength;
        if (count > bytes) {
            count = bytes;
        }

        let offset = 0;
        for(let idx=count-1; idx>=0; idx--) {
            let partailBinary = Binary.fromInt32(uint8Array[idx], 8);
            data = data.splice(offset, partailBinary);
        }

        return data;
    }

    static convertCellDataToBinary(dataCellItemType, cellItemData, bitWidth, lineIdx, variableContext) {
        let binary;
        switch (dataCellItemType){
            case DataCellItemType.number:
                {
                    binary = Binary.fromInt32(cellItemData, bitWidth);
                    break;
                }

            case DataCellItemType.string:
                {
                    binary = UnitTestController.convertStringToBinary(cellItemData, bitWidth);
                    break;
                }

            case DataCellItemType.arithmetic:
                {
                    let value;
                    try{
                        value = VariableCalculator.evaluate(cellItemData, variableContext);
                    }catch{
                        throw new ParseException(
                            'Arithmetic syntax error, text: ' + cellItemData +
                            ', at line: ' + (lineIdx + 1));
                    }

                    if (isNaN(value)) {
                        throw new ParseException(
                            'Evaluate arithmetic error, text: ' + cellItemData +
                            ', at line: ' + (lineIdx + 1));
                    }

                    binary = Binary.fromInt32(value, bitWidth);
                    break;
                }

            case DataCellItemType.ignore:
                {
                    break;
                }
        }
        return binary;
    }
}

module.exports = UnitTestController;
