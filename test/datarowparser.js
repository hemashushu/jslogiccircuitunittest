const { ObjectUtils } = require('jsobjectutils');

const {
    DataRowParser,
    DataCellItem,
    DataCellItemType,
    DataRowItemType
} = require('../index');

const assert = require('assert/strict');

describe('DataRowParser test', () => {
    it('Test parsing data row', () => {
        let { dataRowItem: dataRowItem1 } = DataRowParser.parseLine(0, '0 1 0 1 0b1100 0xff00');
        assert.equal(dataRowItem1.type, DataRowItemType.data);
        assert(ObjectUtils.arrayEquals(dataRowItem1.dataCellItems, [
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0b1100, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0xff00, highZ: 0 })
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
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.ignore),
            new DataCellItem(DataCellItemType.string, 'x'),
            new DataCellItem(DataCellItemType.arithmetic, 'x')
        ]));

        let { dataRowItem: dataRowItem4 } = DataRowParser.parseLine(0, '1 0 z "z" (z)');
        assert(ObjectUtils.arrayEquals(dataRowItem4.dataCellItems, [
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 }),
            new DataCellItem(DataCellItemType.number, { binary: 0, highZ: 0 }),
            new DataCellItem(DataCellItemType.highZ),
            new DataCellItem(DataCellItemType.string, 'z'),
            new DataCellItem(DataCellItemType.arithmetic, 'z')
        ]));

        let { dataRowItem: dataRowItem5 } = DataRowParser.parseLine(0, '0b10zz11 0xffzz11');
        assert(ObjectUtils.arrayEquals(dataRowItem5.dataCellItems, [
            new DataCellItem(DataCellItemType.number, { binary: 0b100011, highZ: 0b001100 }),
            new DataCellItem(DataCellItemType.number, { binary: 0xff0011, highZ: 0x00ff00 })
        ]));

        let { dataRowItem: dataRowItem6 } = DataRowParser.parseLine(0, '(log2(100)+1) 0b0011 (a + 0xaacc + abs(b)) 1');
        assert(ObjectUtils.arrayEquals(dataRowItem6.dataCellItems, [
            new DataCellItem(DataCellItemType.arithmetic, 'log2(100)+1'),
            new DataCellItem(DataCellItemType.number, { binary: 0b0011, highZ: 0 }),
            new DataCellItem(DataCellItemType.arithmetic, 'a + 0xaacc + abs(b)'),
            new DataCellItem(DataCellItemType.number, { binary: 1, highZ: 0 })
        ]));
    });
});
