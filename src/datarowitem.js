const DataRowItemType = require('./datarowitemtype');

class DataRowItem {
    constructor(type = DataRowItemType.data, // data/group/nop
        lineIdx,
        dataCellItems = [],
        variableName, // 可能为 undefined
        from=0, // 循环的开始值（索引包括）
        to=0, // 循环的结束值（索引包括）
        childDataRowItems=[]) {

        this.type = type;
        this.lineIdx = lineIdx;

        // 只有 DataRowItemType 为 data 时，才有下列属性
        this.dataCellItems = dataCellItems;

        // 只有 DataRowItemType 为 group 时，才有下列属性。
        this.variableName = variableName; // string [a-z][a-z0-9_]*
        this.from = from; // number
        this.to = to; // number
        this.childDataRowItems = childDataRowItems; // child data row items
    }
}

module.exports = DataRowItem;