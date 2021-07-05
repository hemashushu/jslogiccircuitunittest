const DataRowItemType = require('./datarowitemtype');

class DataRowItem {
    constructor(type = DataRowItemType.data,
        textContent = '',
        variableName,
        from=0,
        to=0,
        rows=[]) {
        this.type = type;
        this.textContent = textContent;
        this.variableName = variableName;
        this.from = from;
        this.to = to;
        this.rows = rows;
    }
}

module.exports = DataRowItem;