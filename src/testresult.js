class TestResult {
    constructor(pass = true,
        lineIdx, portName, actual, expect) {
        this.pass = pass;

        // 仅当 pass 的值为 false 时，才有下列属性。
        this.lineIdx = lineIdx;
        this.portName = portName;
        this.actual = actual;
        this.expect = expect;
    }
}

module.exports = TestResult;