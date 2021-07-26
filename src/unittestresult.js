class UnitTestResult {
    constructor(title, scriptName, scriptFilePath, testResult) {
        this.title = title;
        this.scriptName = scriptName;
        this.scriptFilePath = scriptFilePath;
        this.testResult = testResult;
    }
}

module.exports = UnitTestResult;