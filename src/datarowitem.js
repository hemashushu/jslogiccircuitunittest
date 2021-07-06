const DataRowItemType = require('./datarowitemtype');

class DataRowItem {
    constructor(type = DataRowItemType.data, // data/group/nop
        dataCellItems = [],
        variableName,
        from=0,
        to=0,
        dataRowItems=[]) {
        this.type = type;
        this.dataCellItems = dataCellItems;
        this.variableName = variableName; // string [a-z][a-z0-9_]*
        this.from = from; // number
        this.to = to; // number
        this.dataRowItems = dataRowItems; // child data row items
    }
}

module.exports = DataRowItem;