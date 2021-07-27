const DataCellItemType = require('./datacellitemtype');

class DataCellItem {
    constructor(dataCellItemType = DataCellItemType.number, data) {
        this.type = dataCellItemType;

        // 当 DataCellItemType 为：
        // - number：data 储存的是 {value: Number, highZ: Number}。
        // - string: data 储存的是字符串。
        // - arithmetic: data 是算式表达式字符串。
        // - highZ: data 为 undefined。
        // - ignore: data 为 undefined。
        this.data = data;
    }
}

module.exports = DataCellItem;