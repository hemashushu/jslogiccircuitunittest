class ScriptItem {
    constructor(name, frontMatter = {}, portItems = [], dataRowItems = []) {
        this.name = name;
        this.frontMatter = frontMatter;
        this.portItems = portItems;
        this.dataRowItems = dataRowItems;
    }
}

module.exports = ScriptItem;