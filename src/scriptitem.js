class ScriptItem {
    constructor(name, scriptFilePath, frontMatter = {}, portItems = [], dataRowItems = []) {
        this.name = name;
        this.scriptFilePath = scriptFilePath;
        this.frontMatter = frontMatter;
        this.portItems = portItems;
        this.dataRowItems = dataRowItems;
    }
}

module.exports = ScriptItem;