const DataRowItem = require('./datarowitem');

class DataRowParser {
    static parseDataRow(rowText) {
        return new DataRowItem();
    }

    static parseRepeatRow(rowText) {
        return new DataRowItem();
    }

    static parseLoopRow(rowText) {
        return new DataRowItem();
    }

    static parseNopRow(towText) {
        return new DataRowItem();
    }
}

module.exports = DataRowParser;