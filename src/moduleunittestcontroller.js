const path = require('path');

const { IllegalArgumentException } = require('jsexception');
const { PromiseFileUtils } = require('jsfileutils');
const { LocaleProperty } = require('jsfileconfig');
const { LogicPackageLoader, LogicModuleLoader, PackageResourceLocator } = require('jslogiccircuit');

const ScriptParser = require('./scriptparser');
const UnitTestController = require('./unittestcontroller');
const UnitTestResult = require('./unittestresult');
const TestResult = require('./testresult');
const ModuleUnitTestResult = require('./moduleunittestresult');

class ModuleUnitTestController {
    /**
     * - 如果指定的逻辑包或者逻辑模块找不到，会抛出 IllegalArgumentException 异常。
     * - 如果脚本有语法错误，会抛出 ScriptParseException 异常。
     * @param {*} packageName
     * @param {*} moduleClassName
     * @returns
     */
    static async loadModuleUnitTestScriptItems(packageName, moduleClassName) {
        let logicPackageItem = LogicPackageLoader.getLogicPackageItemByName(packageName);
        if (logicPackageItem === undefined) {
            throw new IllegalArgumentException(
                `Can not find the specified package "${packageName}".`);
        }

        let logicModuleItem = LogicModuleLoader.getLogicModuleItemByName(packageName, moduleClassName);
        if (logicModuleItem === undefined) {
            throw new IllegalArgumentException(
                `Can not find the specified module "${moduleClassName}".`);
        }

        let modulePath = moduleClassName.replace(/\$/g, path.sep);
        let parentModulePath = path.dirname(modulePath);
        let folderName = path.basename(modulePath);

        let packageResourceLocator = PackageResourceLocator.create(logicPackageItem.packageDirectory);
        let moduleResourceLocator = packageResourceLocator.createModuleResourceLocator(parentModulePath, folderName, false);
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
     * - 如果指定的逻辑包或者逻辑模块找不到，会抛出 IllegalArgumentException 异常。
     * - 脚本文件有语法错误时抛出 ScriptParseException 异常。
     *
     * @param {*} packageName
     * @param {*} moduleClassName
     * @param {*} localeCode 诸如 'en', 'zh-CN', 'jp' 等本地化语言代码。
     * @returns ModuleUnitTestResult
     */
    static async testModule(packageName, moduleClassName, localeCode = 'en') {
        let scriptItems = await ModuleUnitTestController.loadModuleUnitTestScriptItems(
            packageName, moduleClassName);

        let unitTestResults = [];

        for (let scriptItem of scriptItems) {

            // 尝试获取单元测试的标题
            // 标题被写到 Front-Matter 的 "!title" 属性里，如果
            // 不存在该属性，则使用脚本文件的名称（即不带扩展名的文件名）作为标题。

            let frontMatter = scriptItem.frontMatter;
            let title = LocaleProperty.getValue(frontMatter, '!title', localeCode);
            if (title === undefined) {
                title = scriptItem.name;
            }

            let unitTestResult;

            try{
                // - 如果逻辑包或者逻辑模块找不到，则抛出 IllegalArgumentException 异常。
                // - 如果**脚本里的**端口列表指定的端口或者子模块找不到，则抛出 ScriptParseException 异常。
                let unitTestController = new UnitTestController(
                    packageName, moduleClassName, title,
                    scriptItem);

                unitTestResult = unitTestController.test();

            }catch(err) {
                // 构造一个结果为异常的 TestResult 对象。
                let testResult = new TestResult(false,
                    undefined, undefined, undefined, undefined, err);

                let scriptName = scriptItem.name;
                let scriptFilePath = scriptItem.scriptFilePath;

                unitTestResult = new UnitTestResult(
                    scriptName, scriptFilePath, title,
                    testResult);
            }

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