const path = require('path');

const { ObjectUtils } = require('jsobjectutils');
const { BitRange } = require('jslogiccircuit');

const {
    ScriptParseException,
    ParseErrorCode,
    ScriptParser,
    FrontMatterParser,
    PortListParser,
    DataRowParser,
    PortItem,
    SlicePortItem,
    CombinedPortItem,
    DataCellItem,
    DataCellItemType,
    DataRowItemType
} = require('../index');

const assert = require('assert/strict');

describe('ScriptParse test', () => {
    describe('FrontMatterParser test', () => {
        it('Test base', () => {
            let fm1 = FrontMatterParser.parseLine(0, 'number: 123');
            assert(ObjectUtils.equals(fm1, { key: 'number', value: 123 }));

            let fm2 = FrontMatterParser.parseLine(0, 'boolean:True');
            assert(ObjectUtils.equals(fm2, { key: 'boolean', value: true }));

            let fm3 = FrontMatterParser.parseLine(0, 'string: foo');
            assert(ObjectUtils.equals(fm3, { key: 'string', value: 'foo' }));

            let fm4 = FrontMatterParser.parseLine(0, 'quote string: "Foo Bar"');
            assert(ObjectUtils.equals(fm4, { key: 'quote string', value: 'Foo Bar' }));

            let fm5 = FrontMatterParser.parseLine(0, 'long number: 123_456');
            assert(ObjectUtils.equals(fm5, { key: 'long number', value: 123456 }));

            let fm6 = FrontMatterParser.parseLine(0, 'binary: 0b11_00');
            assert(ObjectUtils.equals(fm6, { key: 'binary', value: 0b1100 }));

            let fm7 = FrontMatterParser.parseLine(0, 'hex: 0xff_00');
            assert(ObjectUtils.equals(fm7, { key: 'hex', value: 0xff00 }));

            let fm8 = FrontMatterParser.parseLine(0, 'number with comment: 456 # rem1');
            assert(ObjectUtils.equals(fm8, { key: 'number with comment', value: 456 }));

            let fm9 = FrontMatterParser.parseLine(0, 'boolean with comment: false # rem2');
            assert(ObjectUtils.equals(fm9, { key: 'boolean with comment', value: false }));

            let fm10 = FrontMatterParser.parseLine(0, 'string with comment: hello # rem3');
            assert(ObjectUtils.equals(fm10, { key: 'string with comment', value: 'hello' }));

            let fm11 = FrontMatterParser.parseLine(0, 'quote string with comment: "hello # world"  #rem4');
            assert(ObjectUtils.equals(fm11, { key: 'quote string with comment', value: 'hello # world' }));
        });

        it('Test exception', () => {
            try {
                FrontMatterParser.parseLine(0, 'string with no ending quote: "Hello! World');
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
                assert.equal(e.parseErrorDetail.messageId, 'no-ending-quote-in-front-matter-line');
                assert.equal(e.parseErrorDetail.lineIdx, 0);
            }

            try {
                FrontMatterParser.parseLine(0, 'no colon');
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
                assert.equal(e.parseErrorDetail.messageId, 'missing-colon-in-front-matter-line');
                assert.equal(e.parseErrorDetail.lineIdx, 0);
            }
        });
    });

    describe('PortListParser test', () => {
        it('Test base', () => {
            // 多个端口
            let portItems1 = PortListParser.parse(0, 'A B Q');
            assert.equal(portItems1.length, 3);
            assert(ObjectUtils.objectEquals(portItems1[0], new PortItem('A')))
            assert(ObjectUtils.objectEquals(portItems1[1], new PortItem('B')))
            assert(ObjectUtils.objectEquals(portItems1[2], new PortItem('Q')))

            // 端口切片
            let portItems2 = PortListParser.parse(0, 'A[12]');
            assert.equal(portItems2.length, 1);
            assert(portItems2[0] instanceof SlicePortItem);
            assert(ObjectUtils.objectEquals(portItems2[0], new SlicePortItem('A', [new BitRange(12, 12)])));

            // 端口切片-范围
            let portItems3 = PortListParser.parse(0, 'A[7:0]');
            assert.equal(portItems3.length, 1);
            assert(ObjectUtils.objectEquals(portItems3[0], new SlicePortItem('A', [new BitRange(7, 0)])));


            // 端口切片-多段
            let portItems4 = PortListParser.parse(0, 'A[14, 12:10, 9, 7:0]');
            assert.equal(portItems4.length, 1);
            assert(ObjectUtils.objectEquals(portItems4[0],
                new SlicePortItem('A', [
                    new BitRange(14, 14),
                    new BitRange(12, 10),
                    new BitRange(9, 9),
                    new BitRange(7, 0)
                ])));

            // 端口拼接
            let portItems5 = PortListParser.parse(0, '{A3,A2,A1,A0}');
            assert.equal(portItems5.length, 1);
            assert(portItems5[0] instanceof CombinedPortItem);
            assert(ObjectUtils.arrayEquals(portItems5[0].childPortItems,
                [
                    new PortItem('A3'),
                    new PortItem('A2'),
                    new PortItem('A1'),
                    new PortItem('A0')
                ]));

            // 拼接内含切片
            let portItems6 = PortListParser.parse(0, '{A[7:0],B[12, 4:0],C}');
            assert(ObjectUtils.arrayEquals(portItems6[0].childPortItems,
                [
                    new SlicePortItem('A', [new BitRange(7, 0)]),
                    new SlicePortItem('B', [new BitRange(12, 12), new BitRange(4, 0)]),
                    new PortItem('C')
                ]));

            // 单端口、切片、拼接
            let portItems7 = PortListParser.parse(0, 'A B[4:0] {Cout, S}');
            assert.equal(portItems7.length, 3);
            assert(ObjectUtils.arrayEquals(portItems7,
                [
                    new PortItem('A'),
                    new SlicePortItem('B', [new BitRange(4, 0)]),
                    new CombinedPortItem([
                        new PortItem('Cout'),
                        new PortItem('S')
                    ])
                ]));
        });

        it('Test name path', () => {
            let portItems10 = PortListParser.parse(0, 'A.B.C');
            assert.equal(portItems10.length, 1);
            assert(ObjectUtils.objectEquals(portItems10[0], new PortItem('A.B.C')));

            let portItems11 = PortListParser.parse(0, 'A.B.C[4:0]');
            assert.equal(portItems11.length, 1);
            assert(ObjectUtils.objectEquals(portItems11[0], new SlicePortItem('A.B.C', [new BitRange(4, 0)])));

            let portItems12 = PortListParser.parse(0, '{A.B.C, X.Y.Z}');
            assert.equal(portItems12.length, 1);
            assert(ObjectUtils.objectEquals(portItems12[0], new CombinedPortItem([
                new PortItem('A.B.C'),
                new PortItem('X.Y.Z')
            ])));

            let portItems13 = PortListParser.parse(0, '{A.B.C, D, X.Y.Z[7:0]}');
            assert.equal(portItems13.length, 1);
            assert(ObjectUtils.objectEquals(portItems13[0], new CombinedPortItem([
                new PortItem('A.B.C'),
                new PortItem('D'),
                new SlicePortItem('X.Y.Z', [new BitRange(7, 0)])
            ])));

            // 带注释
            let portItems20 = PortListParser.parse(0, 'A #rem2');
            assert(ObjectUtils.equals(portItems20[0], new PortItem('A')));

            let portItems21 = PortListParser.parse(0, 'A B#rem2');
            assert(ObjectUtils.equals(portItems21, [
                new PortItem('A'),
                new PortItem('B')
            ]));

            let portItems22 = PortListParser.parse(0, 'A {B,Q}#rem2');
            assert(ObjectUtils.equals(portItems22, [
                new PortItem('A'),
                new CombinedPortItem([
                    new PortItem('B'),
                    new PortItem('Q')
                ])
            ]));

            let portItems23 = PortListParser.parse(0, 'A {Cout, S} B[4:0]# rem1');
            assert(ObjectUtils.equals(portItems23, [
                new PortItem('A'),
                new CombinedPortItem([
                    new PortItem('Cout'),
                    new PortItem('S')
                ]),
                new SlicePortItem('B', [new BitRange(4, 0)])
            ]));
        });

        it('Test exception', () => {
            try {
                PortListParser.parse(0, 'A.');
                assert.fail();
            } catch (e) {
                assert(e instanceof ScriptParseException);
                assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
                assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
            }

            try {
                PortListParser.parse(0, 'Q A~B');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'invalid-port-name');
                assert.equal(e.parseErrorDetail.data.text, 'A~B');
            }

            try {
                PortListParser.parse(0, 'A[4:0]B');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
                assert.equal(e.parseErrorDetail.columnIdx, 6);
            }

            try {
                PortListParser.parse(0, '{A}B');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
                assert.equal(e.parseErrorDetail.columnIdx, 3);
            }

            try {
                PortListParser.parse(0, '"A"B');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'expect-space-between-port-names');
                assert.equal(e.parseErrorDetail.columnIdx, 3);
            }

            try {
                PortListParser.parse(0, 'A[2');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
            }

            try {
                PortListParser.parse(0, '{A');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
            }

            try {
                PortListParser.parse(0, '{B A.}');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'combined-port-name-syntax-error');
            }

            try {
                PortListParser.parse(0, '{B A}[7:0]');
                assert.fail();
            } catch (e) {
                assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
                assert.equal(e.parseErrorDetail.columnIdx, 5);
            }


        });
    });

    describe('DataRowParser test', () => {
        it('Test data statement', () => {
            let { dataRowItem: dataRowItem1 } = DataRowParser.parseLine(0, '0 1 0 1 0b1100 0xff00');
            assert.equal(dataRowItem1.type, DataRowItemType.data);
            assert(ObjectUtils.arrayEquals(dataRowItem1.dataCellItems, [
                new DataCellItem(DataCellItemType.number, 0),
                new DataCellItem(DataCellItemType.number, 1),
                new DataCellItem(DataCellItemType.number, 0),
                new DataCellItem(DataCellItemType.number, 1),
                new DataCellItem(DataCellItemType.number, 0b1100),
                new DataCellItem(DataCellItemType.number, 0xff00)
            ]));

            let { dataRowItem: dataRowItem2 } = DataRowParser.parseLine(0, '"a" "foo" (1+2) (3+a) bar');
            assert(ObjectUtils.arrayEquals(dataRowItem2.dataCellItems, [
                new DataCellItem(DataCellItemType.string, 'a'),
                new DataCellItem(DataCellItemType.string, 'foo'),
                new DataCellItem(DataCellItemType.arithmetic, '1+2'),
                new DataCellItem(DataCellItemType.arithmetic, '3+a'),
                new DataCellItem(DataCellItemType.arithmetic, 'bar')
            ]));

            let { dataRowItem: dataRowItem3 } = DataRowParser.parseLine(0, '1 0 x "x" (x)');
            assert(ObjectUtils.arrayEquals(dataRowItem3.dataCellItems, [
                new DataCellItem(DataCellItemType.number, 1),
                new DataCellItem(DataCellItemType.number, 0),
                new DataCellItem(DataCellItemType.ignore),
                new DataCellItem(DataCellItemType.string, 'x'),
                new DataCellItem(DataCellItemType.arithmetic, 'x')
            ]));

            let { dataRowItem: dataRowItem4 } = DataRowParser.parseLine(0, '(log2(100)+1) 0b0011 (a + 0xaacc + abs(b)) 1');
            assert(ObjectUtils.arrayEquals(dataRowItem4.dataCellItems, [
                new DataCellItem(DataCellItemType.arithmetic, 'log2(100)+1'),
                new DataCellItem(DataCellItemType.number, 0b0011),
                new DataCellItem(DataCellItemType.arithmetic, 'a + 0xaacc + abs(b)'),
                new DataCellItem(DataCellItemType.number, 1)
            ]));
        });

        it('Test "nop" statement', async () => {
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'nop\n' +
                'nop # rem1\n' +
                '1 1 1';

            let scriptItem = await ScriptParser.parse(textContent);
            let dataRowItems = scriptItem.dataRowItems;
            assert.equal(dataRowItems.length, 4);

            assert.equal(dataRowItems[0].type, DataRowItemType.data);

            assert.equal(dataRowItems[1].type, DataRowItemType.nop);
            assert.equal(dataRowItems[1].lineIdx, 2);

            assert.equal(dataRowItems[2].type, DataRowItemType.nop);
            assert.equal(dataRowItems[2].lineIdx, 3);

            assert.equal(dataRowItems[3].type, DataRowItemType.data);
        });

        it('Test "repeat" statement', async () => {
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'repeat(10, i) 1 i (1+i)\n' +
                '0 0 0\n' +
                'repeat(5) nop\n' +
                ' 1 1 1';

            let scriptItem = await ScriptParser.parse(textContent);
            let dataRowItems = scriptItem.dataRowItems;
            assert.equal(dataRowItems.length, 5);

            assert.equal(dataRowItems[1].type, DataRowItemType.group);
            assert.equal(dataRowItems[1].lineIdx, 2);
            assert.equal(dataRowItems[1].from, 0);
            assert.equal(dataRowItems[1].to, 9);
            assert.equal(dataRowItems[1].variableName, 'i');
            assert.equal(dataRowItems[1].childDataRowItems.length, 1);

            assert.equal(dataRowItems[1].childDataRowItems[0].type, DataRowItemType.data);
            assert(ObjectUtils.arrayEquals(dataRowItems[1].childDataRowItems[0].dataCellItems, [
                new DataCellItem(DataCellItemType.number, 1),
                new DataCellItem(DataCellItemType.arithmetic, 'i'),
                new DataCellItem(DataCellItemType.arithmetic, '1+i')
            ]));

            assert.equal(dataRowItems[3].type, DataRowItemType.group);
            assert.equal(dataRowItems[3].lineIdx, 4);
            assert.equal(dataRowItems[3].from, 0);
            assert.equal(dataRowItems[3].to, 4);
            assert.equal(dataRowItems[3].variableName, undefined);
            assert.equal(dataRowItems[3].childDataRowItems.length, 1);
            assert.equal(dataRowItems[3].childDataRowItems[0].type, DataRowItemType.nop);
        });

        it('Test "for" statement', async () => {
            let textContent =
                'A B Q\n' +
                '0 0 0\n' +
                'for(i, 0, 10)\n' +
                '  0 i 0\n' +
                '  (~i) i 0\n' +
                'end\n' +
                ' 1 1 1';

            let scriptItem = await ScriptParser.parse(textContent);
            let dataRowItems = scriptItem.dataRowItems;
            assert.equal(dataRowItems.length, 3);

            assert.equal(dataRowItems[1].type, DataRowItemType.group);
            assert.equal(dataRowItems[1].lineIdx, 2);
            assert.equal(dataRowItems[1].from, 0);
            assert.equal(dataRowItems[1].to, 10);
            assert.equal(dataRowItems[1].variableName, 'i');
            assert.equal(dataRowItems[1].childDataRowItems.length, 2);

            assert.equal(dataRowItems[1].childDataRowItems[0].type, DataRowItemType.data);
            assert(ObjectUtils.arrayEquals(dataRowItems[1].childDataRowItems[0].dataCellItems, [
                new DataCellItem(DataCellItemType.number, 0),
                new DataCellItem(DataCellItemType.arithmetic, 'i'),
                new DataCellItem(DataCellItemType.number, 0)
            ]));

            assert.equal(dataRowItems[1].childDataRowItems[1].type, DataRowItemType.data);
            assert(ObjectUtils.arrayEquals(dataRowItems[1].childDataRowItems[1].dataCellItems, [
                new DataCellItem(DataCellItemType.arithmetic, '~i'),
                new DataCellItem(DataCellItemType.arithmetic, 'i'),
                new DataCellItem(DataCellItemType.number, 0)
            ]));
        });

        it('Test cascading "for" statement', async () => {
            let textContent =
                'A B Q\n' +
                'for(i, 0, 10)\n' +
                '  i 0 0\n' +
                '  for(j, 15, 20)\n' +
                '    i j (i+j)\n' +
                '  end\n' +
                '  1 1 1\n' +
                'end\n';

            let scriptItem = await ScriptParser.parse(textContent);
            let dataRowItems = scriptItem.dataRowItems;
            assert.equal(dataRowItems.length, 1);

            assert.equal(dataRowItems[0].type, DataRowItemType.group);
            assert.equal(dataRowItems[0].lineIdx, 1);
            assert.equal(dataRowItems[0].from, 0);
            assert.equal(dataRowItems[0].to, 10);
            assert.equal(dataRowItems[0].variableName, 'i');
            assert.equal(dataRowItems[0].childDataRowItems.length, 3);

            let childDataRowItems = dataRowItems[0].childDataRowItems;
            assert.equal(childDataRowItems[0].type, DataRowItemType.data);
            assert.equal(childDataRowItems[0].lineIdx, 2);

            assert.equal(childDataRowItems[2].type, DataRowItemType.data);
            assert.equal(childDataRowItems[2].lineIdx, 6);

            assert.equal(childDataRowItems[1].type, DataRowItemType.group);
            assert.equal(childDataRowItems[1].lineIdx, 3);
            assert.equal(childDataRowItems[1].from, 15);
            assert.equal(childDataRowItems[1].to, 20);
            assert.equal(childDataRowItems[1].variableName, 'j');
            assert.equal(childDataRowItems[1].childDataRowItems.length, 1);

            assert.equal(childDataRowItems[1].childDataRowItems[0].type, DataRowItemType.data);
            assert.equal(childDataRowItems[1].childDataRowItems[0].lineIdx, 4);
            assert(ObjectUtils.arrayEquals(childDataRowItems[1].childDataRowItems[0].dataCellItems, [
                new DataCellItem(DataCellItemType.arithmetic, 'i'),
                new DataCellItem(DataCellItemType.arithmetic, 'j'),
                new DataCellItem(DataCellItemType.arithmetic, 'i+j')
            ]));
        });
    });

    it('Test parse', async () => {
        let textContent =
            `---
        bitWidth: 1
        inputPinCount: 2
        ---
        A B Q
        0 0 0
        0 1 0
        1 0 0
        1 1 1`;

        let scriptItem = await ScriptParser.parse(textContent, 'name1', 'filePath1');

        assert.equal(scriptItem.name, 'name1');
        assert.equal(scriptItem.scriptFilePath, 'filePath1');

        assert(ObjectUtils.equals(scriptItem.frontMatter, {
            bitWidth: 1,
            inputPinCount: 2
        }));

        assert(ObjectUtils.equals(scriptItem.portItems, [
            new PortItem('A'),
            new PortItem('B'),
            new PortItem('Q')
        ]));

        let dataRowItems = scriptItem.dataRowItems;
        assert.equal(dataRowItems.length, 4);

        assert.equal(dataRowItems[0].type, DataRowItemType.data);
        assert.equal(dataRowItems[0].lineIdx, 5);
        assert(ObjectUtils.equals(dataRowItems[0].dataCellItems, [
            new DataCellItem(DataCellItemType.number, 0),
            new DataCellItem(DataCellItemType.number, 0),
            new DataCellItem(DataCellItemType.number, 0)
        ]));

        assert.equal(dataRowItems[1].type, DataRowItemType.data);
        assert.equal(dataRowItems[1].lineIdx, 6);
        assert(ObjectUtils.equals(dataRowItems[1].dataCellItems, [
            new DataCellItem(DataCellItemType.number, 0),
            new DataCellItem(DataCellItemType.number, 1),
            new DataCellItem(DataCellItemType.number, 0)
        ]));

        assert.equal(dataRowItems[3].type, DataRowItemType.data);
        assert.equal(dataRowItems[3].lineIdx, 8);
        assert(ObjectUtils.equals(dataRowItems[3].dataCellItems, [
            new DataCellItem(DataCellItemType.number, 1),
            new DataCellItem(DataCellItemType.number, 1),
            new DataCellItem(DataCellItemType.number, 1)
        ]));

    });

    it('Test parseFile', async () => {
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'sample_test_script_1.txt');

        let scriptItem = await ScriptParser.parseFile(scriptFile1);
        assert.equal(scriptItem.name, 'sample_test_script_1.txt');

        // 检查 front matter
        let frontMatter = scriptItem.frontMatter;
        assert.equal(frontMatter.bitWidth, 1);
        assert.equal(frontMatter.inputPinCount, 2);

        assert(ObjectUtils.arrayEquals(frontMatter.someObject, [
            { address: 0, value: 0 },
            { address: 1, value: 0 },
            { address: 2, value: 0 },
            { address: 3, value: 1 }
        ]));

        assert.equal(frontMatter.someBinary.toString('utf-8'), 'hello');

        // 检查 data row items
        let dataRowItems = scriptItem.dataRowItems;
        assert.equal(dataRowItems.length, 4);

        let lineIdxs = dataRowItems.map(item => item.lineIdx);
        assert(ObjectUtils.arrayEquals(lineIdxs, [7, 8, 9, 10]));

        let cellRows = dataRowItems.map(item => item.dataCellItems);
        assert(ObjectUtils.arrayEquals(cellRows,
            [
                [
                    new DataCellItem(DataCellItemType.number, 0),
                    new DataCellItem(DataCellItemType.number, 0),
                    new DataCellItem(DataCellItemType.number, 0)
                ],
                [
                    new DataCellItem(DataCellItemType.number, 0),
                    new DataCellItem(DataCellItemType.number, 1),
                    new DataCellItem(DataCellItemType.number, 0)
                ],
                [
                    new DataCellItem(DataCellItemType.number, 1),
                    new DataCellItem(DataCellItemType.number, 0),
                    new DataCellItem(DataCellItemType.number, 0)
                ],
                [
                    new DataCellItem(DataCellItemType.number, 1),
                    new DataCellItem(DataCellItemType.number, 1),
                    new DataCellItem(DataCellItemType.number, 1)
                ]
            ]
        ));
    });
});