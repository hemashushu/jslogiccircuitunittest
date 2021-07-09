const DataCellItemType = require('./datacellitemtype');

class DataCellItem {
    constructor(dataCellItemType = DataCellItemType.number, data) {
        this.type = dataCellItemType;

        // 当 DataCellItemType 为：
        // - number：data 储存的是数字的十进制的值。
        // - string: data 储存的是字符串。
        // - arithmetic: data 是算式表达式字符串。
        // - ignore: data 为 undefined。
        this.data = data;
    }
}

module.exports = DataCellItem;