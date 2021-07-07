const path = require('path');

const { Binary } = require('jsbinary');
const { LogicPackageLoader } = require('jslogiccircuit');
const { UnitTestController,
    ScriptParser,
    FrontMatterParser,
    PortListParser,
    DataRowParser } = require('../index');

const assert = require('assert/strict');

describe('Parse script file test', () => {
    it('FrontMatterParser Test', async ()=>{
        let textContent =
            'number: 123\n' +
            'boolean:True\n' +
            'string: foo\n' +
            'quote string: "Foo Bar"\n' +
            'long number: 123_456\n' +
            'binary: 0b11_00\n' +
            'hex: 0xff_00\n' +
            'number with comment: 456 # rem1\n' +
            'boolean with comment: false # rem2\n' +
            'string with comment: hello # rem3\n' +
            'quote string with comment: "hello # world"  #rem4';

        let lines = textContent.split('\n');

        for(let line of lines) {
            let frontMatterLine = FrontMatterParser.parseLine(0, line);
            //console.log(frontMatterLine);
        }
    });

    it('Test PortListParser', ()=>{
        let portItems = PortListParser.parse(0, 'A B[8:0]  C[2,3,9:8,12:8]  Cout {C,D,  E} {a[1,2,4],  basdf ,  c[8:7]} A.B.C Adder.Q[9:0] {Foo.Bar    , Adder[8:0], Cool.as.ice}  # rem1');
        for(let portItem of portItems) {
            //console.log(portItem.getTitle());
        }
    });

    describe('Test DataRowParser',()=>{
        it('Test parseDataRow()',() => {
            let dataRowItem1 =  DataRowParser.parseDataRow(0, '0 1 0 1 0b1100 0xff00');
            let dataRowItem2 = DataRowParser.parseDataRow(0, '"a" "foo" (1+2) (3+a) "bar"');
            let dataRowItem3 = DataRowParser.parseDataRow(0, '1 0 * "*"');
            let dataRowItem4 = DataRowParser.parseDataRow(0, '(log2(100)+1) 0b0011 (a + 0xaacc + abs(b)) 1');
        });

        it('Test "nop" statement', ()=>{
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'nop\n' +
                'nop # rem1\n' +
                '1 1 1';

            let scriptItem = ScriptParser.parse('test', textContent);
            // console.log(scriptItem);
        });

        it('Test "repeat" statement', ()=>{
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'repeat(10, i) 1 i (1+i)\n' +
                '0 0 0\n' +
                'repeat(5) nop\n' +
                ' 1 1 1';

            let scriptItem = ScriptParser.parse('test', textContent);
            // console.log(scriptItem);
        });

        it('Test "for" statement', ()=>{
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'for(i, 0, 10)\n' +
                '  0 i 0\n' +
                '  (~i) i 0\n' +
                'end\n' +
                ' 1 1 1';

            let scriptItem = ScriptParser.parse('test', textContent);
            // console.log(scriptItem);
        });

        it('Test cascading "for" statement', ()=>{
            let textContent =
                'A B Q\n' +
                'for(i, 0, 10)\n' +
                '  i 0 0\n' +
                '  for(j, 15, 20)\n' +
                '    i j (i+j)\n' +
                '  end\n' +
                '  1 1 1\n' +
                'end\n';

            let scriptItem = ScriptParser.parse('test', textContent);
            // console.log(JSON.stringify(scriptItem, undefined, '  '));
        });
    });

    it('Test parseFile', async ()=>{
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'sample_test_script_1.txt');

        let scriptItem = await ScriptParser.parseFile(scriptFile1);
        // console.log(scriptItem);
    });
});