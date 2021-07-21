const { Binary } = require('jsbinary');
const { VariableCalculator } = require('jsvariablecalculator');

const { ModuleController,
    LogicModuleFactory,
    Signal,
    PinDirection } = require('jslogiccircuit');

const CombinedTestPin = require('./combinedtestpin');
const DataCellItemType = require('./datacellitemtype');
const DataRowItemType = require('./datarowitemtype');
const ParseErrorCode = require('./parseerrorcode');
const ParseErrorDetail = require('./parseerrordetail');
const PortItem = require('./portitem');
const ScriptParseException = require('./scriptparseexception');
const SlicePortItem = require('./sliceportitem');
const SliceTestPin = require('./slicetestpin');
const TestPin = require('./testpin');
const TestResult = require('./testresult');
const UnitTestResult = require('./unittestresult');

class UnitTestController {
    /**
     * 构造测试控制器
     * 需要先把待测试模块的逻辑包（及其逻辑模块）加载
     *
     * - 如果逻辑包或者逻辑模块找不到，则抛出 IllegalArgumentException 异常。
     * - 如果**脚本里的**端口列表指定的端口或者子模块找不到，则抛出 ScriptParseException 异常。
     *
     * @param {*} packageName
     * @param {*} moduleClassName
     */
    constructor(packageName, moduleClassName, title, scriptItem) {

        this.title = title; // 单元测试的标题
        this.scriptName = scriptItem.name; // 测试脚本的名称（即不带扩展名的文件名）
        this.scriptFilePath = scriptItem.scriptFilePath;
        this.dataRowItems = scriptItem.dataRowItems; // 待测试的数据

        let frontMatter = scriptItem.frontMatter;
        let portItems = scriptItem.portItems;

        // 时序模式标记
        this.seqMode = (frontMatter['!seq'] === true);

        // 构造模块测试参数
        let parameters = {};
        for (let key in frontMatter) {
            if (key.startsWith('!')) {
                continue;
            }

            parameters[key] = frontMatter[key];
        }

        let logicModule = LogicModuleFactory.createModuleInstance(
            packageName, moduleClassName, 'unitTestlogicModule', parameters);

        // 构造端口读写列表
        this.testPins = this.generateTestPins(logicModule, portItems);

        // 模块控制器（运行器）
        this.moduleController = new ModuleController(logicModule);
    }

    /**
     *
     * @param {*} logicModule
     * @param {*} portItems
     * @returns AbstractTestPin 对象数组，如果端口列表指定的
     *     端口或者子模块找不到，则抛出 ScriptParseException 异常。
     */
    generateTestPins(logicModule, portItems) {
        let testPins = [];
        for (let portItem of portItems) {
            testPins.push(this.generateTestPin(logicModule, portItem));
        }
        return testPins;
    }

    generateTestPin(logicModule, portItem) {
        if (portItem instanceof PortItem) {
            return this.convertToTestPin(logicModule, portItem);
        } else if (portItem instanceof SlicePortItem) {
            return this.convertToSliceTestPin(logicModule, portItem);
        } else {
            return this.convertToCombinedTestPin(logicModule, portItem);
        }
    }

    convertToTestPin(logicModule, portItem) {
        let { pin, canTestInput } = this.getPinByNamePath(logicModule, portItem.namePath);
        let title = portItem.getTitle();
        return new TestPin(title, canTestInput, pin);
    }

    convertToSliceTestPin(logicModule, slicePortItem) {
        let { pin, canTestInput } = this.getPinByNamePath(logicModule, slicePortItem.namePath);
        let title = slicePortItem.getTitle();
        return new SliceTestPin(title, canTestInput, slicePortItem.bitRanges, pin);
    }

    convertToCombinedTestPin(logicModule, combinedPortItem) {
        let childTestPins = [];
        for (let portItem of combinedPortItem.childPortItems) {
            if (portItem instanceof PortItem) {
                childTestPins.push(this.convertToTestPin(logicModule, portItem));
            } else {
                childTestPins.push(this.convertToSliceTestPin(logicModule, portItem));
            }
        }

        let canTestInput = true;
        for (let testPin of childTestPins) {
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
     *     端口或者子模块找不到，则抛出 ScriptParseException 异常。
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
        for (let idx = 0; idx < names.length - 1; idx++) {
            let logicModuleName = names[idx];

            if (typeof targetLogicModule.getLogicModule === 'function') {
                targetLogicModule = targetLogicModule.getLogicModule(logicModuleName);
            } else {
                targetLogicModule = undefined;
            }

            if (targetLogicModule === undefined) {
                throw new ScriptParseException(
                    'Can not found the specified module',
                    new ParseErrorDetail(ParseErrorCode.moduleNotFound,
                        'module-not-found', undefined, undefined, {
                        moduleName: logicModuleName
                    }));
            }
        }

        let pinName = names[names.length - 1];

        let pin = targetLogicModule.getPin(pinName);
        if (pin !== undefined) {
            canTestInput = canTestInput && (pin.pinDirection === PinDirection.input);
            return {
                pin: pin,
                canTestInput: canTestInput
            };
        }

        // 输出端口只能用于输出测试（当然了）
        canTestInput = false;
        pin = targetLogicModule.getPin(pinName);
        if (pin !== undefined) {
            return {
                pin: pin,
                canTestInput: canTestInput
            };
        }

        throw new ScriptParseException(
            'Can not found the specified port',
            new ParseErrorDetail(ParseErrorCode.portNotFound,
                'port-not-found', undefined, undefined, {
                portName: namePath
            }));
    }


    /**
     *
     * @returns
     */
    test() {
        let groupTestResult;

        try{
            let variableContext = {};
            groupTestResult = this.testDataRowItems(
                this.dataRowItems, variableContext, undefined, 0, 0);

        }catch(err){
            groupTestResult = new TestResult(false,
                undefined, undefined, undefined, undefined,
                err);
        }

        return new UnitTestResult(
            this.scriptName, this.scriptFilePath, this.title,
            groupTestResult);
    }

    /**
     *
     * - 如果模块存在振荡，则抛出 OscillatingException 异常。
     * - 如果模块存在短路情况，则抛出 ShortCircuitException 异常。
     * - 如果测试脚本存在错误（一般语法错误在加载脚本时已经检测，这里是因为
     *   算术表达式引起的错误），则抛出 ScriptParseException 异常。
     *
     * @param {*} dataRowItems
     * @param {*} variableContext
     * @param {*} variableName
     * @param {*} fromValue
     * @param {*} toValue
     * @returns TestResult. 对象的结构为： {pass, lineIdx}
     *     - 如果测试通过，则返回 {pass: true}，
     *     - 如果测试不通过，则返回 {pass: false,
     *           lineIdx: Number, portName: String,
     *           expect: Binary, actual: Binary}
     */
    testDataRowItems(dataRowItems, variableContext, variableName, fromValue, toValue) {
        for (let value = fromValue; value <= toValue; value++) {
            if (variableName !== undefined) {
                // 并不是所有的组都有变量
                variableContext[variableName] = value;
            }

            for (let idx = 0; idx < dataRowItems.length; idx++) {
                let dataRowItem = dataRowItems[idx];
                let lineIdx = dataRowItem.lineIdx;

                if (dataRowItem.type === DataRowItemType.data) {
                    // 数据测试

                    let dataCellItems = dataRowItem.dataCellItems;

                    // 1. 设置输入数据
                    for (let column = 0; column < this.testPins.length; column++) {
                        let testPin = this.testPins[column];
                        if (!testPin.isInput) {
                            continue;
                        }

                        let dataCellItem = dataCellItems[column];
                        let signal = UnitTestController.convertCellDataToSignal(
                            dataCellItem.type, dataCellItem.data, testPin.bitWidth,
                            lineIdx, variableContext);

                        // 单元格的内容是一个 "x" 字符，表示不检查输出数据，此字符
                        // 不用用于输入信号。
                        if (signal === undefined) {
                            throw new ScriptParseException(
                                'Cannot set wildcard asterisk to input port',
                                new ParseErrorDetail(ParseErrorCode.syntaxError,
                                    'wildcard-asterisk-syntax-error', lineIdx, undefined, {
                                    portName: testPin.name
                                }));
                        }

                        testPin.setSignal(signal);
                    }

                    // 2. 更新模块状态
                    this.moduleController.step();

                    // 3. 检验输出数据
                    for (let column = 0; column < this.testPins.length; column++) {
                        let testPin = this.testPins[column];
                        if (testPin.isInput) {
                            continue;
                        }
                        let dataCellItem = dataCellItems[column];

                        let expectSignal = UnitTestController.convertCellDataToSignal(
                            dataCellItem.type, dataCellItem.data, testPin.bitWidth,
                            lineIdx, variableContext);

                        // 单元格的内容是一个 "x" 字符，表示不检查输出数据
                        if (expectSignal === undefined) {
                            continue;
                        }

                        let actualSignal = testPin.getSignal();

                        if (!Signal.equal(actualSignal, expectSignal)) {
                            return new TestResult(false,
                                lineIdx, testPin.name,
                                actualSignal, expectSignal);
                        }
                    }

                    // 4. 如果是时序模式，则空更新一次模块状态（模块一般
                    //    连接了时钟信号）
                    if (this.seqMode === true) {
                        this.moduleController.step();
                    }

                } else if (dataRowItem.type === DataRowItemType.nop) {
                    // 空转一次
                    if (this.seqMode === true) {
                        this.moduleController.step();
                        this.moduleController.step();
                    } else {
                        this.moduleController.step();
                    }

                } else {
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

        let data = Binary.fromInt32(0, bitWidth);
        let bytes = Math.ceil(bitWidth / 4);
        let count = uint8Array.length; //byteLength;
        if (count > bytes) {
            count = bytes;
        }

        let offset = 0;
        for (let idx = count - 1; idx >= 0; idx--) {
            let partailBinary = Binary.fromInt32(uint8Array[idx], 8);
            data = data.splice(offset, partailBinary);
        }

        return data;
    }

    /**
     * 转换 “测试脚本数据行” 当中的单元格为 Signal 对象。
     *
     * @param {*} dataCellItemType
     * @param {*} cellItemData
     * @param {*} bitWidth
     * @param {*} lineIdx
     * @param {*} variableContext
     * @returns
     */
    static convertCellDataToSignal(dataCellItemType, cellItemData, bitWidth, lineIdx, variableContext) {
        let signal;

        switch (dataCellItemType) {
            case DataCellItemType.number:
                {
                    let binary = Binary.fromInt32(cellItemData, bitWidth);
                    signal = Signal.createWithoutHighZ(bitWidth, binary);
                    break;
                }

            case DataCellItemType.string:
                {
                    let binary = UnitTestController.convertStringToBinary(cellItemData, bitWidth);
                    signal = Signal.createWithoutHighZ(bitWidth, binary);
                    break;
                }

            case DataCellItemType.arithmetic:
                {
                    let value;
                    try {
                        value = VariableCalculator.evaluate(cellItemData, variableContext);
                    } catch {
                        throw new ScriptParseException(
                            'Arithmetic syntax error',
                            new ParseErrorDetail(ParseErrorCode.syntaxError,
                                'arithmetic-syntax-error', lineIdx, undefined, {
                                text: cellItemData
                            }));
                    }

                    if (isNaN(value)) {
                        throw new ScriptParseException(
                            'Arithmetic evaluating error',
                            new ParseErrorDetail(ParseErrorCode.evaluateError,
                                'arithmetic-evaluating-error', lineIdx, undefined, {
                                text: cellItemData
                            }));
                    }

                    let binary = Binary.fromInt32(value, bitWidth);
                    signal = Signal.createWithoutHighZ(bitWidth, binary);
                    break;
                }

            case DataCellItemType.highZ:
                {
                    signal = Signal.createHighZ(bitWidth);
                    break;
                }

            case DataCellItemType.ignore:
                {
                    break;
                }
        }

        return signal;
    }
}

module.exports = UnitTestController;
