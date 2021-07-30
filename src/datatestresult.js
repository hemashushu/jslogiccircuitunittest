class DataTestResult {
    constructor(pass = true,
        lineIdx, portName, actual, expect,
        exception) {
        this.pass = pass;

        // 仅当 pass 的值为 false 时，才有下列属性。
        this.lineIdx = lineIdx;
        this.portName = portName;
        this.actual = actual; // 实际的信号，一个 Signal 对象。
        this.expect = expect; // 预期的信号，一个 Signal 对象。

        // 当测试有异常时才有下列属性。
        //
        // 可能的异常有：
        // - 如果逻辑包或者逻辑模块找不到，则抛出 IllegalArgumentException 异常。
        // - 如果**脚本里的**端口列表指定的端口或者子模块找不到，则抛出 ScriptParseException 异常。
        // - 如果测试脚本存在错误，则抛出 ScriptParseException 异常，一般的语法错误
        //   在加载脚本时已经检测，这里的错误是因为错误的算术表达式等原因引起的。
        // - 如果模块存在振荡，则抛出 OscillatingException 异常。
        // - 如果模块存在短路情况，则抛出 ShortCircuitException 异常。
        this.exception = exception;
    }
}

module.exports = DataTestResult;