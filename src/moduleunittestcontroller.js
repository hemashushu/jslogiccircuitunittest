const path = require('path');

const { IllegalArgumentException } = require('jsexception');
const { LocaleProperty } = require('jsfileconfig');
const { LogicPackageLoader, LogicModuleLoader, PackageResourceLocator } = require('jslogiccircuit');
const { PromiseFileUtils } = require('jsfileutils');

const DataTestResult = require('./datatestresult');
const FrontMatterResolver = require('./frontmatterresolver');
const ModuleUnitTestResult = require('./moduleunittestresult');
const ScriptParser = require('./scriptparser');
const UnitTestController = require('./unittestcontroller');
const UnitTestResult = require('./unittestresult');

class ModuleUnitTestController {

    /**
     * 测试指定逻辑模块（包括仿真模块）的所有测试脚本。
     *
     * - 如果指定的逻辑包或者逻辑模块找不到，会抛出 IllegalArgumentException 异常。
     *
     * 解析脚本可能会抛出的异常：
     * - 如果 YAML 对象文件解析失败，会抛出 ParseException。
     * - 如果脚本有语法错误，会抛出 ScriptParseException 异常。
     * - 如果参数外部文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果参数外部文件读取失败，则抛出 IOException 异常。
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
            let unitTestResult = ModuleUnitTestController.testModuleByScriptItem(
                packageName, moduleClassName, scriptItem, localeCode);
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
        let unitTestResult = ModuleUnitTestController.testModuleByScriptItem(
            packageName, moduleClassName, scriptItem, localeCode);
        return unitTestResult;
    }

    static testModuleByScriptItem(packageName, moduleClassName, scriptItem, localeCode = 'en') {
        // 尝试获取单元测试的标题
        // 标题被写到 Front-Matter 的 "!title" 属性里，如果
        // 不存在该属性，则使用脚本文件的名称（即不带扩展名的文件名）作为标题。

        let attributeItems = scriptItem.attributeItems;

        let localeTitleMap = FrontMatterResolver.getLocaleFormatAttributeMapByTitle(
            attributeItems, 'title');

        let title = LocaleProperty.getValue(localeTitleMap, 'title', localeCode);
        if (title === undefined) {
            title = scriptItem.name;
        }

        let unitTestResult;

        try {
            // - 如果逻辑包或者逻辑模块找不到，则抛出 IllegalArgumentException 异常。
            // - 如果**脚本里的**端口列表指定的端口或者子模块找不到，则抛出 ScriptParseException 异常。
            let unitTestController = new UnitTestController(
                packageName, moduleClassName, title,
                scriptItem.attributeItems, scriptItem.configParameters,
                scriptItem.portItems, scriptItem.dataRowItems,
                scriptItem.name, scriptItem.filePath);

            unitTestResult = unitTestController.test();

        } catch (err) {
            // 构造一个结果为异常的 DataTestResult 对象。
            let dataTestResult = new DataTestResult(false,
                undefined, undefined, undefined, undefined, err);

            let scriptName = scriptItem.name;
            let scriptFilePath = scriptItem.filePath;

            // 构造 UnitTestResult 对象。
            unitTestResult = new UnitTestResult(
                title,
                scriptName, scriptFilePath,
                dataTestResult);
        }

        return unitTestResult;
    }

    /**
     * 加载指定逻辑模块（包括仿真模块）的所有测试脚本。
     *
     * - 如果指定的逻辑包或者逻辑模块找不到，会抛出 IllegalArgumentException 异常。
     *
     * 解析脚本可能会抛出的异常：
     * - 如果 YAML 对象文件解析失败，会抛出 ParseException。
     * - 如果脚本有语法错误，会抛出 ScriptParseException 异常。
     * - 如果参数外部文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果参数外部文件读取失败，则抛出 IOException 异常。
     *
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

        let logicModuleItem = LogicModuleLoader.getLogicModuleItemByName(packageName, moduleClassName, true);
        if (logicModuleItem === undefined) {
            throw new IllegalArgumentException(
                `Can not find the specified module "${moduleClassName}".`);
        }

        let modulePath = moduleClassName.replace(/\$/g, path.sep); // 层次型的模块使用 $ 符号分隔模块名
        let parentModulePath = path.dirname(modulePath);
        let folderName = path.basename(modulePath);

        let packageResourceLocator = PackageResourceLocator.create(logicPackageItem.packageDirectory);
        let moduleResourceLocator = packageResourceLocator.createModuleResourceLocator(
            parentModulePath, folderName, logicModuleItem.isSimulation);

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

}

module.exports = ModuleUnitTestController;