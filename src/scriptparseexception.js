const { LogicCircuitException } = require('jslogiccircuit');

class ScriptParseException extends LogicCircuitException {
    constructor(message, parseErrorDetail) {
        super(message);

        this.parseErrorDetail = parseErrorDetail;
    }
}

module.exports = ScriptParseException;