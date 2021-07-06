const DataCellItemType = require('./datacellitemtype');

class DataCellItem {
    constructor(dataCellItemType = DataCellItemType.number, data) {
        this.dataCellItemType = dataCellItemType;

        // 当 DataCellItemType 为 number 时，data 储存的是
        // 数字的十进制的值。
        this.data = data;
    }
}

module.exports = DataCellItem;