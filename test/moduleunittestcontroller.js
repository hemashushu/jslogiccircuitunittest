const path = require('path');

const { IllegalArgumentException } = require('jsexception');
const { ObjectUtils } = require('jsobjectutils');
const { LogicPackageLoader } = require('jslogiccircuit');

const {
    ModuleUnitTestController,
    UnitTestController,
    ScriptParser,
    ScriptParseException,
    ParseErrorCode
} = require('../index');

const assert = require('assert/strict');

describe('ModuleUnitTestController Test', () => {
    it('Test load unit test items', async () => {
        let testDirectory = __dirname;
        let sampleLogicPackageRepositoryDirectory = path.join(testDirectory, 'resources');

        let packageItem = await LogicPackageLoader.loadLogicPackage(sampleLogicPackageRepositoryDirectory,
            'sample_logic_package_for_unit_test');

        let scriptItems = await ModuleUnitTestController.loadModuleUnitTestScriptItems(
            packageItem.name, 'nand_gate');

        let scriptNames = scriptItems.map(item => {
            return item.name;
        });

        scriptNames.sort();

        assert(ObjectUtils.arrayEquals(scriptNames,
            ['1_bit_2_pin', '1_bit_2_pin.failed', '1_bit_3_pin', '2_bit_2_pin']));
    });

    it('Test module all unit test scripts', async () => {
        let testDirectory = __dirname;
        let sampleLogicPackageRepositoryDirectory = path.join(testDirectory, 'resources');

        let packageItem = await LogicPackageLoader.loadLogicPackage(sampleLogicPackageRepositoryDirectory,
            'sample_logic_package_for_unit_test');

        let moduleUnitTestResult = await ModuleUnitTestController.testModule(
            packageItem.name, 'nand_gate');

        assert.equal(moduleUnitTestResult.packageName, packageItem.name);
        assert.equal(moduleUnitTestResult.moduleClassName, 'nand_gate');

        let unitTestResults = moduleUnitTestResult.unitTestResults;

        let successfulItems = unitTestResults.filter(item => item.testResult.pass);
        let successfulScriptNames = successfulItems.map(item => item.scriptName);
        successfulScriptNames.sort();

        assert(ObjectUtils.arrayEquals(
            successfulScriptNames,
            ['1_bit_2_pin', '1_bit_3_pin', '2_bit_2_pin']));

        let failedItems = unitTestResults.filter(item => !item.testResult.pass);
        assert.equal(failedItems.length, 1);
        assert.equal(failedItems[0].scriptName, '1_bit_2_pin.failed');

        let failedTestResult = failedItems[0].testResult;
        assert.equal(failedTestResult.lineIdx, 7);
        assert.equal(failedTestResult.actual.toBinaryString(), '0');
        assert.equal(failedTestResult.expect.toBinaryString(), '1');
    });
});