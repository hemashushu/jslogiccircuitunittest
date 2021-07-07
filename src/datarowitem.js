const DataRowItemType = require('./datarowitemtype');

class DataRowItem {
    constructor(type = DataRowItemType.data, // data/group/nop
        lineIdx,
        dataCellItems = [],
        variableName, // 可能为 undefined
        from=0, // 循环的开始值（索引包括）
        to=0, // 循环的结束值（索引包括）
        dataRowItems=[]) {
        this.type = type;
        this.lineIdx = lineIdx;
        this.dataCellItems = dataCellItems;
        this.variableName = variableName; // string [a-z][a-z0-9_]*
        this.from = from; // number
        this.to = to; // number
        this.dataRowItems = dataRowItems; // child data row items
    }
}

module.exports = DataRowItem;