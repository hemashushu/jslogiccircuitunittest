const ParseErrorCode = require('./parseerrorcode');

class ParseErrorDetail {
    constructor(parseErrorCode = ParseErrorCode.syntaxError,
            messageId,
            lineIdx,
            columnIdx,
            data = {}) {

        this.code = parseErrorCode;
        this.messageId = messageId;
        this.lineIdx = lineIdx;
        this.columnIdx = columnIdx;
        this.data = data;
    }
}

module.exports = ParseErrorDetail;