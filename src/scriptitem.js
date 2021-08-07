class ScriptItem {
    constructor(name, filePath,
        attributeItems = [], configParameters = {}, portItems = [], dataRowItems = []) {

        this.name = name; // 测试脚本的名称（即不带扩展名的文件名）
        this.filePath = filePath;
        this.attributeItems = attributeItems;
        this.configParameters = configParameters;
        this.portItems = portItems;
        this.dataRowItems = dataRowItems;
    }
}

module.exports = ScriptItem;