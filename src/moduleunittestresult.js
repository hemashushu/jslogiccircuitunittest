class ModuleUnitTestResult {
    constructor(packageName, moduleClassName, unitTestResults) {
        this.packageName = packageName;
        this.moduleClassName = moduleClassName;
        this.unitTestResults = unitTestResults;
    }
}

module.exports = ModuleUnitTestResult;