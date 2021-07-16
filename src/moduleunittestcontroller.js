const path = require('path');

const { IllegalArgumentException } = require('jsexception');
const { PromiseFileUtils } = require('jsfileutils');
const { LogicPackageLoader, PackageResourceLocator } = require('jslogiccircuit');

const ScriptParser = require('./scriptparser');
const UnitTestController = require('./unittestcontroller');
const ModuleUnitTestResult = require('./moduleunittestresult');

class ModuleUnitTestController {
    static async loadModuleUnitTestScriptItems(packageName, moduleClassName) {
        let logicPackageItem = LogicPackageLoader.getLogicPackageItemByName(packageName);
        if (logicPackageItem === undefined) {
            throw new IllegalArgumentException(
                `Can not find the specified package "${packageName}".`);
        }

        let packageResourceLocator = PackageResourceLocator.create(logicPackageItem.packageDirectory);
        let moduleResourceLocator = packageResourceLocator.createModuleResourceLocator(moduleClassName);
        let moduleTestDirectory = moduleResourceLocator.getModuleTestDirectory();

        if (!await PromiseFileUtils.exists(moduleTestDirectory)) {
            return []; // test dir not found
        }

        let fileInfos = await PromiseFileUtils.list(moduleTestDirectory);
        let scriptFileInfos = fileInfos.filter(item => {
            return item.fileName.endsWith('.test.txt');
        });

        let scriptItems = [];
        for (let scriptFileInfo of scriptFileInfos) {
            let scriptItem = await ScriptParser.parseFile(scriptFileInfo.filePath);
            scriptItems.push(scriptItem);
        }

        return scriptItems;
    }

    /**
     *
     * @param {*} packageName
     * @param {*} moduleClassName
     * @param {*} localeCode
     * @returns ModuleUnitTestResult
     */
    static async testModule(packageName, moduleClassName, localeCode = 'en') {
        // 逻辑包或模块找不到时会抛出 IllegalArgumentException 异常。
        // 脚本文件有错误时抛出 ScriptParseException 异常。
        // 如果电路振荡会抛出 OscillatingException 异常。
        let scriptItems = await ModuleUnitTestController.loadModuleUnitTestScriptItems(
            packageName, moduleClassName);

        let unitTestResults = [];

        for (let scriptItem of scriptItems) {
            let unitTestController = new UnitTestController(
                packageName,
                moduleClassName,
                scriptItem, localeCode);

            let unitTestResult = unitTestController.test();
            unitTestResults.push(unitTestResult);
        }

        return new ModuleUnitTestResult(packageName, moduleClassName, unitTestResults);
    }

    /**
     *
     * @param {*} packageName
     * @param {*} moduleClassName
     * @param {*} scriptFilePath
     * @param {*} localeCode
     * @returns UnitTestResult
     */
    static async testModuleByScriptFilePath(packageName, moduleClassName, scriptFilePath, localeCode = 'en') {
        let scriptItem = await ScriptParser.parseFile(scriptFilePath);
        let unitTestController = new UnitTestController(
            packageName,
            moduleClassName,
            scriptItem, localeCode);

        return unitTestController.test();
    }
}

module.exports = ModuleUnitTestController;