class ScriptItem {
    constructor(name, frontMatter = {}, portItems = [], dataRows = []) {
        this.name = name;
        this.frontMatter = frontMatter;
        this.portItems = portItems;
        this.dataRows = dataRows;
    }
}

module.exports = ScriptItem;