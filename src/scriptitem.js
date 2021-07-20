class ScriptItem {
    constructor(name, scriptFilePath, frontMatter = {}, portItems = [], dataRowItems = []) {
        this.name = name; // 测试脚本的名称（即不带扩展名的文件名）
        this.scriptFilePath = scriptFilePath;
        this.frontMatter = frontMatter;
        this.portItems = portItems;
        this.dataRowItems = dataRowItems;
    }
}

module.exports = ScriptItem;