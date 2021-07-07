const DataCellItemType = require('./datacellitemtype');

class DataCellItem {
    constructor(dataCellItemType = DataCellItemType.number, data) {
        this.dataCellItemType = dataCellItemType;

        // 当 DataCellItemType 为：
        // - number：data 储存的是数字的十进制的值。
        // - bytes: data 储存的是使用 UTF-8 编码转换字符串而得的 Uint8Array。
        // - arithmetic: data 是算式表达式字符串。
        // - ignore: data 为 undefined。
        this.data = data;
    }
}

module.exports = DataCellItem;