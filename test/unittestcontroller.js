const path = require('path');

const { Binary } = require('jsbinary');

const {
    LogicPackageLoader,
    ModuleController,
    LogicModuleFactory } = require('jslogiccircuit');

const {
    UnitTestController,
    ScriptParser } = require('../index');

const assert = require('assert/strict');

describe('UnitTestController Test', () => {
    before(async () => {
        // 加载逻辑包
        // 逻辑包使用 jslogiccircuit 项目所使用的测试资源
        let testDirectory = __dirname;
        let projectDirectory = path.dirname(testDirectory);
        let jslogiccircuitPackageDirectory = path.join(
            projectDirectory, 'node_modules', 'jslogiccircuit');
        let sampleLogicPackageDirectory = path.join(
            jslogiccircuitPackageDirectory, 'test', 'resources');

        let packageNames = [
            'sample_logic_package_by_code',
            'sample_logic_package_by_config',
            'sample_logic_package_by_mix'];

        for (let packageName of packageNames) {
            await LogicPackageLoader.loadLogicPackage(sampleLogicPackageDirectory,
                packageName);
        }
    });

    it('And gate test', async () => {
        // 加载测试脚本
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'and_gate_test.txt');

        let scriptItem1 = await ScriptParser.parseFile(scriptFile1); // 有可能抛出 ParseException 异常

        // 构造测试控制器
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_code',
            'and_gate',
            scriptItem1); // 有可能抛出 ParseException 异常

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    it('Or gate test', ()=>{
        let scriptItem1 = ScriptParser.parse('or_gate_test',
            'A B Q\n' +
            '0 0 0\n' +
            '0 1 1\n' +
            '1 0 1\n' +
            '1 1 1');

        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_code',
            'or_gate',
            scriptItem1);

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });
});
