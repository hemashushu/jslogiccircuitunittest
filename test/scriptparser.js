const path = require('path');

const { Binary } = require('jsbinary');
const { LogicPackageLoader } = require('jslogiccircuit');
const { UnitTestController, ScriptParser } = require('../index');

const assert = require('assert/strict');

describe('Parse script file test', () => {
    it('parseFile', async ()=>{
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'sample_test_script_1.txt');

        let scriptItem = await ScriptParser.parseFile(scriptFile1);
        console.log(scriptItem);
    });
});