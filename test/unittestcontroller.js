const path = require('path');
const { IllegalArgumentException } = require('jsexception');

const { LogicPackageLoader } = require('jslogiccircuit');

const { UnitTestController,
    ScriptParser,
    ScriptParseException,
    ParseErrorCode
} = require('../index');

const assert = require('assert/strict');

// 加载测试脚本的辅助方法
async function loadTestScript(scriptFileName) {
    let testDirectory = __dirname;
    let resourcesDirectory = path.join(testDirectory, 'resources');
    let scriptFile1 = path.join(resourcesDirectory, scriptFileName);
    let scriptItem1 = await ScriptParser.parseFile(scriptFile1); // 有可能抛出 ParseException 异常
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
        let scriptItem1 = await loadTestScript('and_gate_test.txt')

        // 构造测试控制器
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_code',
            'and_gate',
            scriptItem1); // 有可能抛出 ParseException 异常

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    it('And gate ext test', async () => {
        let scriptItem1 = await loadTestScript('and_gate_ext_test.txt')

        // 构造测试控制器
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_code',
            'and_gate_ext',
            scriptItem1); // 有可能抛出 ParseException 异常

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    it('Half adder test', async () => {
        let scriptItem1 = await loadTestScript('half_adder_test.txt')
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_config', 'half_adder',
            scriptItem1);

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    it('Full adder test', async () => {
        let scriptItem1 = await loadTestScript('full_adder_test.txt')
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_mix', 'full_adder',
            scriptItem1);

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    it('4-bit adder test', async () => {
        let scriptItem1 = await loadTestScript('four_bit_adder_test.txt')
        let unitTestController1 = new UnitTestController(
            'sample_logic_package_by_mix', 'four_bit_adder',
            scriptItem1);

        let testResult1 = unitTestController1.test();
        assert.equal(testResult1.pass, true);
    });

    describe('Test fail', () => {
        it('Test construct error cause of package not found', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0');

            try {
                let unitTestController1 = new UnitTestController(
                    'no-this-package', 'or_gate', scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof IllegalArgumentException);
            }
        });

        it('Test construct error cause of module not found', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0');

            try {
                let unitTestController1 = new UnitTestController(
                    'sample_logic_package_by_code', 'or_gate_ext', scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof IllegalArgumentException);
            }
        });

        it('Test module in port list not found error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A subModule.B Q\n' + // <-- not module named 'subModule'
                '0 0 0');

            try {
                let unitTestController1 = new UnitTestController(
                    'sample_logic_package_by_code', 'or_gate', scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.moduleNotFound);
                assert.equal(e.parseErrorDetail.data.moduleName, 'subModule');
            }
        });

        it('Test port in port list not found error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Out\n' + // <-- no port named 'Out'
                '0 0 0');

            try {
                new UnitTestController(
                    'sample_logic_package_by_code', 'or_gate', scriptItem1);
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.portNotFound);
                assert.equal(e.parseErrorDetail.data.portName, 'Out');
            }
        });

        it('Test check error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 1\n' +
                '1 0 0\n' + // <-- line idx 3 check error
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'sample_logic_package_by_code', 'or_gate', scriptItem1);

            let testResult1 = unitTestController1.test();
            assert.equal(testResult1.pass, false);
            assert.equal(testResult1.lineIdx, 3);
            assert.equal(testResult1.portName, 'Q');
            assert.equal(testResult1.actual.toBinaryString(), '1');
            assert.equal(testResult1.expect.toBinaryString(), '0');
        });

        it('Test check error in loop', () => {
            let scriptItem1 = ScriptParser.parse('Full adder test',
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
                'sample_logic_package_by_mix', 'full_adder', scriptItem1);

            let testResult1 = unitTestController1.test();
            assert.equal(testResult1.pass, false);
            assert.equal(testResult1.lineIdx, 9);
            assert.equal(testResult1.portName, '{Cout, S}');
            assert.equal(testResult1.actual.toBinaryString(), '1');  // 0b1
            assert.equal(testResult1.expect.toBinaryString(), '10'); // 0b10
        });

        it('Test input data syntax error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0\n' +
                '* 1 1\n' +  // <-- line idx 2 input data syntax error (wildcard is not allowed for input port)
                '1 0 1\n' +
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'sample_logic_package_by_code', 'or_gate', scriptItem1);

            try {
                unitTestController1.test();
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
                assert.equal(e.parseErrorDetail.messageId, 'wildcard-asterisk-syntax-error');
                assert.equal(e.parseErrorDetail.lineIdx, 2);
                assert.equal(e.parseErrorDetail.data.portName, 'A');
            }
        });

        it('Test arithmetic syntax error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 1\n' +
                '1 0 (1++1)\n' + // <-- line idx 3 arithmetic syntax error
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'sample_logic_package_by_code', 'or_gate', scriptItem1);

            try {
                unitTestController1.test();
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
                assert.equal(e.parseErrorDetail.messageId, 'arithmetic-syntax-error');
                assert.equal(e.parseErrorDetail.lineIdx, 3);
                assert.equal(e.parseErrorDetail.data.text, '1++1');
            }
        });

        it('Test arithmetic evaluate error', () => {
            let scriptItem1 = ScriptParser.parse('OR gate test',
                'A B Q\n' +
                '0 0 0\n' +
                '0 1 (a+b)\n' +  // <-- line idx 2 arithmetic syntax error
                '1 0 1\n' +
                '1 1 1');

            let unitTestController1 = new UnitTestController(
                'sample_logic_package_by_code', 'or_gate', scriptItem1);

            try {
                unitTestController1.test();
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.evaluateError);
                assert.equal(e.parseErrorDetail.messageId, 'arithmetic-evaluating-error');
                assert.equal(e.parseErrorDetail.lineIdx, 2);
                assert.equal(e.parseErrorDetail.data.text, 'a+b');
            }
        });
    });
});
