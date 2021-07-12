class UnitTestResult {
    constructor(scriptName, scriptFilePath, title, testResult) {
        this.scriptName = scriptName;
        this.scriptFilePath = scriptFilePath;
        this.title = title;
        this.testResult = testResult;
    }
}

module.exports = UnitTestResult;