class TestResult {
    constructor(pass = true,
        lineIdx, portName, actual, expect) {
        this.pass = pass;
        this.lineIdx = lineIdx;
        this.portName = portName;
        this.actual = actual;
        this.expect = expect;
    }
}

module.exports = TestResult;