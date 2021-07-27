class UnitTestResult {
    constructor(title, scriptName, scriptFilePath, dataTestResult) {
        this.title = title;
        this.scriptName = scriptName;
        this.scriptFilePath = scriptFilePath;
        this.dataTestResult = dataTestResult;
    }
}

module.exports = UnitTestResult;