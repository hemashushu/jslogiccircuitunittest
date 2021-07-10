class AbstractPortItem {
    constructor(namePath) {
        this.namePath = namePath;
    }

    getTitle() {
        return this.namePath;
    }

    isValid() {
        // 端口名称名称只可以包含 [0-9a-zA-Z_\$] 字符，且只能以 [a-zA-Z_] 字符开头
        return /^[a-zA-Z_][\w\$]*(\.[a-zA-Z_][\w\$]*)*$/.test(this.namePath);
    }
}

module.exports = AbstractPortItem;