const path = require('path');

const { PackageRepositoryManager,
    LogicPackageLoader,
    LogicPackageNotFoundException,
    LogicModuleNotFoundException } = require('jslogiccircuit');

const { UnitTestController,
    ScriptParser,
    ScriptParseException,
    ParseErrorCode
} = require('../index');

const assert = require('assert/strict');

function getScriptFilePath(scriptFileName) {
    let testDirectory = __dirname;
    let resourcesDirectory = path.join(testDirectory, 'resources');
    let scriptFilePath1 = path.join(resourcesDirectory, scriptFileName);
    return scriptFilePath1;
}

// 加载测试脚本的辅助方法
async function loadTestScript(scriptFileName) {
    let scriptFilePath1 = getScriptFilePath(scriptFileName);
    let scriptItem1 = await ScriptParser.parseFile(scriptFilePath1); // 有可能抛出 ScriptParseException 异常
    return scriptItem1;
}

describe('UnitTestController Test', () => {
    before(async () => {
        // 加载逻辑包
        // 逻辑包使用 jslogiccircuit 项目所使用的测试资源
        let testDirectory = __dirname;
        let projectDirectory = path.dirname(testDirectory);
        let jslogiccircuitPackageDirectory = path.join(
            projectDirectory, 'node_modules', 'jslogiccircuit');
        let sampleLogicPackageRepositoryDirectory = path.join(
            jslogiccircuitPackageDirectory, 'test', 'resources', 'package-repository-2');

        let packageRepositoryManager1 = new PackageRepositoryManager();
        packageRepositoryManager1.addRepositoryDirectory(sampleLogicPackageRepositoryDirectory, false);

        let packageNames = [
            'package-by-code',
            'package-by-config',
            'package-by-mix'];

        for (let packageName of packageNames) {
            await LogicPackageLoader.loadLogicPackage(
                packageRepositoryManager1, packageName);
        }
    });

    it('And gate test', async () => {
        let scriptItem1 = await loadTestScript('and_gate.test.txt')

        // 构造测试控制器
        let unitTestController1 = new UnitTestController(
            'package-by-code',
            'and_gate',
            'title',
            scriptItem1);

        let unitTestResult1 = unitTestController1.test();
        assert.equal(unitTestResult1.title, 'title');
        assert.equal(unitTestResult1.scriptName, 'and_gate');
        assert.equal(unitTestResult1.scriptFilePath, getScriptFilePath('and_gate.test.txt'));
        assert.equal(unitTestResult1.testResult.pass, true);
    });

    it('And gate (with parameters) test', async () => {
        let scriptItem1 = await loadTestScript('and_gate_parameters.test.txt')

        // 构造测试控制器
        let unitTestController1 = new UnitTestController(
            'package-by-code',
            'and_gate_parameter',
            'title',
            scriptItem1);

        let { testResult } = unitTestController1.test();
        assert.equal(testResult.pass, true);
    });

    it('Half adder test', async () => {
        let scriptItem1 = await loadTestScript('half_adder.test.txt')
        let unitTestController1 = new UnitTestController(
            'package-by-config',
            'half_adder',
            'title',
            scriptItem1);

        let { testResult } = unitTestController1.test();
        assert.equal(testResult.pass, true);
    });

    it('Full adder test', async () => {
        let scriptItem1 = await loadTestScript('full_adder.test.txt')
        let unitTestController1 = new UnitTestController(
            'package-by-mix',
            'full_adder',
            'title',
            scriptItem1);

        let { testResult } = unitTestController1.test();
        assert.equal(testResult.pass, true);
    });

    it('4-bit adder test', async () => {
        let scriptItem1 = await loadTestScript('four_bit_adder.test.txt')
        let unitTestController1 = new UnitTestController(
            'package-by-mix',
            'four_bit_adder',
            'title',
            scriptItem1);

        let { testResult } = unitTestController1.test();
        assert.equal(testResult.pass, true);
    });

    describe('Test fail', () => {
        it('Test construct error cause of package not found', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0');

            try {
                new UnitTestController(
                    'no-this-package',
                    'or_gate', 'title',
                    scriptItem1);

                assert.fail();
            } catch (e) {
                assert(e instanceof LogicPackageNotFoundException);
            }
        });

        it('Test construct error cause of module not found', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0');

            try {
                new UnitTestController(
                    'package-by-code',
                    'or_gate_ext', 'title',
                    scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof LogicModuleNotFoundException);
            }
        });

        it('Test construct error cause of module (in the port list) not found error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A subModule.B Q\n' + // <-- not module named 'subModule'
                '0 0 0');

            try {
                new UnitTestController(
                    'package-by-code',
                    'or_gate',
                    'title',
                    scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.moduleNotFound);
                assert.equal(e.parseErrorDetail.data.moduleName, 'subModule');
            }
        });

        it('Test construct error cause of port (in the port list) not found error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Out\n' + // <-- no port named 'Out'
                '0 0 0');

            try {
                new UnitTestController(
                    'package-by-code',
                    'or_gate', 'title',
                    scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.portNotFound);
                assert.equal(e.parseErrorDetail.data.portName, 'Out');
            }
        });

        it('Test check error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 1\n' +
                '1 0 0\n' + // <-- line idx 3 check error
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'package-by-code',
                'or_gate',
                'title',
                scriptItem1);

            let { testResult } = unitTestController1.test();

            assert.equal(testResult.pass, false);
            assert.equal(testResult.lineIdx, 3);
            assert.equal(testResult.portName, 'Q');
            assert.equal(testResult.actual.getBinary().toBinaryString(), '1');
            assert.equal(testResult.expect.getBinary().toBinaryString(), '0');
        });

        it('Test check error in loop', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Cin {Cout, S}\n' +
                '0 0 0   0\n' +
                '0 1 0   1\n' +
                '1 0 0   1\n' +
                '1 1 0   2\n' +
                '\n' +
                'for(i,0,1)\n' +
                '  for(j,0,1)\n' +
                '    i j 0 (i+j)\n' +
                '    i j 1 (i+j+2)\n' + // <-- line idx 9
                '  end\n' +
                'end\n' +
                '\n' +
                '0 0 1   1\n' +
                '0 1 1   2\n' +
                '1 0 1   2\n' +
                '1 1 1   3');

            let unitTestController1 = new UnitTestController(
                'package-by-mix',
                'full_adder',
                'title',
                scriptItem1);

            let { testResult } = unitTestController1.test();
            assert.equal(testResult.pass, false);
            assert.equal(testResult.lineIdx, 9);
            assert.equal(testResult.portName, '{Cout, S}');
            assert.equal(testResult.actual.getBinary().toBinaryString(), '01');  // 0b01
            assert.equal(testResult.expect.getBinary().toBinaryString(), '10');  // 0b10
        });

        it('Test input data syntax error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0\n' +
                'x 1 1\n' +  // <-- line idx 2 input data syntax error (wildcard is not allowed for input port)
                '1 0 1\n' +
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'package-by-code',
                'or_gate',
                'title',
                scriptItem1);

            let {testResult} = unitTestController1.test();
            let e = testResult.exception;

            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
            assert.equal(e.parseErrorDetail.messageId, 'wildcard-asterisk-syntax-error');
            assert.equal(e.parseErrorDetail.lineIdx, 2);
            assert.equal(e.parseErrorDetail.data.portName, 'A');
        });

        it('Test arithmetic syntax error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 1\n' +
                '1 0 (1++1)\n' + // <-- line idx 3 arithmetic syntax error
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'package-by-code',
                'or_gate',
                'title',
                scriptItem1);


            let {testResult} = unitTestController1.test();
            let e = testResult.exception;

            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
            assert.equal(e.parseErrorDetail.messageId, 'arithmetic-syntax-error');
            assert.equal(e.parseErrorDetail.lineIdx, 3);
            assert.equal(e.parseErrorDetail.data.text, '1++1');
        });

        it('Test arithmetic evaluate error', async () => {
            let scriptItem1 = await ScriptParser.parse(
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 (a+b)\n' +  // <-- line idx 2 arithmetic syntax error
                '1 0 1\n' +
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'package-by-code',
                'or_gate',
                'title',
                scriptItem1);


            let {testResult} = unitTestController1.test();
            let e = testResult.exception;

            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.evaluateError);
            assert.equal(e.parseErrorDetail.messageId, 'arithmetic-evaluating-error');
            assert.equal(e.parseErrorDetail.lineIdx, 2);
            assert.equal(e.parseErrorDetail.data.text, 'a+b');
        });
    });
});
