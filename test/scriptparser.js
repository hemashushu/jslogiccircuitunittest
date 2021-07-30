const path = require('path');

const { ObjectUtils } = require('jsobjectutils');

const {
    ScriptParseException,
    ParseErrorCode,
    ScriptParser,
    PortItem,
    DataCellItem,
    DataCellItemType,
    DataRowItemType
} = require('../index');

const assert = require('assert/strict');

describe('ScriptParse test - statements', () => {
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
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
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
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.arithmetic, 'i'),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
        ]));

        assert.equal(dataRowItems[1].childDataRowItems[1].type, DataRowItemType.data);
        assert(ObjectUtils.arrayEquals(dataRowItems[1].childDataRowItems[1].dataCellItems, [
            new DataCellItem(DataCellItemType.arithmetic, '~i'),
            new DataCellItem(DataCellItemType.arithmetic, 'i'),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
        ]));
    });

    it('Test "for" cascading statement', async () => {
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

describe('ScriptParser test - integrated', () => {
    it('Test parsing from text', async () => {
        let textContent =
            '---\n' +
            'bitWidth: 1\n' +
            'inputPinCount: 2\n' +
            '---\n' +
            'A B Q\n' +
            '0 0 0\n' +
            '0 1 0\n' +
            '1 0 0\n' +
            '1 1 1';

        let scriptItem = await ScriptParser.parse(textContent, 'name1', 'filePath1');

        assert.equal(scriptItem.name, 'name1');
        assert.equal(scriptItem.filePath, 'filePath1');

        assert(ObjectUtils.equals(scriptItem.configParameters, {
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
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
        ]));

        assert.equal(dataRowItems[1].type, DataRowItemType.data);
        assert.equal(dataRowItems[1].lineIdx, 6);
        assert(ObjectUtils.equals(dataRowItems[1].dataCellItems, [
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
        ]));

        assert.equal(dataRowItems[3].type, DataRowItemType.data);
        assert.equal(dataRowItems[3].lineIdx, 8);
        assert(ObjectUtils.equals(dataRowItems[3].dataCellItems, [
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 })
        ]));

    });

    it('Test data cells count mismatch', async () => {

        let textContent1 =
            'A B Q\n' +
            '0 0 0\n' +
            '0 1 1\n' +
            '1 0\n' + // <-- line idx 3 cell items count mismatch port items count
            '1 1 1';

        try{
            await ScriptParser.parse(textContent1, 'name1', 'filePath1');
            assert.fail();
        }catch(err) {
            assert(err instanceof ScriptParseException)

            let parseErrorDetail = err.parseErrorDetail;
            assert.equal(parseErrorDetail.code, ParseErrorCode.mismatchDataCellCount);
            assert.equal(parseErrorDetail.messageId, 'mismatch-data-cell-count');
            assert.equal(parseErrorDetail.lineIdx, 3);
            assert(ObjectUtils.objectEquals(parseErrorDetail.data, { pinsCount: 3, cellsCount: 2 }));
        }

        let textContent2 =
            'A B Q\n' +
            '0 0 0\n' +
            '1 1 1\n' +
            'for(i,0,1)\n' +
            '  0 1 1 (i)\n' + // <-- line idx 4 cell items count mismatch port items count
            'end\n' +
            '1 0 1';

        try{
            await ScriptParser.parse(textContent2, 'name1', 'filePath1');
            assert.fail();
        }catch(err) {
            assert(err instanceof ScriptParseException)

            let parseErrorDetail = err.parseErrorDetail;
            assert.equal(parseErrorDetail.code, ParseErrorCode.mismatchDataCellCount);
            assert.equal(parseErrorDetail.messageId, 'mismatch-data-cell-count');
            assert.equal(parseErrorDetail.lineIdx, 4);
            assert(ObjectUtils.objectEquals(parseErrorDetail.data, { pinsCount: 3, cellsCount: 4 }));
        }
    });

    it('Test parsing from file', async () => {
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');
        let scriptFile1 = path.join(resourcesDirectory, 'sample_script_1.test.txt');

        let scriptItem = await ScriptParser.parseFile(scriptFile1);
        assert.equal(scriptItem.name, 'sample_script_1');

        // 检查 front matter
        let configParameters = scriptItem.configParameters;
        assert.equal(configParameters.bitWidth, 1);
        assert.equal(configParameters.inputPinCount, 2);

        assert(ObjectUtils.arrayEquals(configParameters.someObject, [
            { address: 0, value: 0 },
            { address: 1, value: 0 },
            { address: 2, value: 0 },
            { address: 3, value: 1 }
        ]));

        assert.equal(configParameters.someBinary.toString('utf-8'), 'hello');

        // 检查 data row items
        let dataRowItems = scriptItem.dataRowItems;
        assert.equal(dataRowItems.length, 4);

        let lineIdxs = dataRowItems.map(item => item.lineIdx);
        assert(ObjectUtils.arrayEquals(lineIdxs, [7, 8, 9, 10]));

        let cellRows = dataRowItems.map(item => item.dataCellItems);
        assert(ObjectUtils.arrayEquals(cellRows,
            [
                [
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
                ],
                [
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
                ],
                [
                    new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 })
                ],
                [
                    new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
                    new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 })
                ]
            ]
        ));
    });
});