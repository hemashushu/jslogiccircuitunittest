class ScriptItem {
    constructor(name, frontMatters = [], ports = [], dataRows = []) {
        this.name = name;
        this.frontMatters = frontMatters;
        this.ports = ports;
        this.dataRows = dataRows;
    }
}

module.exports = ScriptItem;