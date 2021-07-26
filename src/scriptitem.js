class ScriptItem {
    constructor(name, filePath,
        attributes = {}, configParameters = {}, portItems = [], dataRowItems = []) {

        this.name = name; // 测试脚本的名称（即不带扩展名的文件名）
        this.filePath = filePath;
        this.attributes = attributes;
        this.configParameters = configParameters;
        this.portItems = portItems;
        this.dataRowItems = dataRowItems;
    }
}

module.exports = ScriptItem;