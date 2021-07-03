const path = require('path');

const { Binary } = require('jsbinary');
const { LogicPackageLoader } = require('jslogiccircuit');
const { UnitTestController, ScriptParser } = require('../index');

const assert = require('assert/strict');

// describe('Logic-Circuit-Unit-Test Test', () => {
//     it('Base', async () => {
//         let testDirectory = __dirname;
//         let projectDirectory = path.dirname(testDirectory);
//         let jslogiccircuitPackageDirectory = path.join(
//             projectDirectory, 'node_modules', 'jslogiccircuit');
//         let sampleLogicPackageDirectory = path.join(
//             jslogiccircuitPackageDirectory, 'test', 'resources');
//
//         let packageNames = [
//             'sample_logic_package_by_code',
//             'sample_logic_package_by_config',
//             'sample_logic_package_by_mix'];
//
//         for (let packageName of packageNames) {
//             await LogicPackageLoader.loadLogicPackage(sampleLogicPackageDirectory,
//                 packageName);
//         }
//
//         console.log(LogicPackageLoader.getLogicPackageItems());
//     });
// });
