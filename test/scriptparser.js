const path = require('path');

const { Binary } = require('jsbinary');
const { LogicPackageLoader } = require('jslogiccircuit');
const { UnitTestController,
    ScriptParser,
    FrontMatterParser,
    PortListParser } = require('../index');

const assert = require('assert/strict');

describe('Parse script file test', () => {
    it('parseFile', async ()=>{

        // FrontMatterParser test
        //
        // let lines = 'number: 123\nboolean:True\nstring: foo\nquote string: "Foo Bar"'.split('\n');
        // for(let line of lines) {
        //     let frontMatterLine = FrontMatterParser.parseLine(line);
        //     console.log(frontMatterLine);
        // }

        // port list test
        //
        // let portItems = PortListParser.parse('A B[8:0]  C[2,3,9:8,12:8]  Cout {C,D,  E} {a[1,2,4],  basdf ,  c[8:7]} A.B.C Adder.Q[9:0] {Foo.Bar    , Adder[8:0], Cool.as.ice}');
        // for(let portItem of portItems) {
        //     console.log(portItem.getTitle());
        // }


        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'sample_test_script_1.txt');

        let scriptItem = await ScriptParser.parseFile(scriptFile1);
        console.log(scriptItem.frontMatter);
        console.log(scriptItem.portItems);
        // console.log(scriptItem.dataRows);


    });
});