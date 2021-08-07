class FrontMatterItem {
    /**
     * 头信息项目
     *
     * 注意头信息的项目名称是允许重复的，比如设置端口固定值的语句：
     * '!set: portname=portvalue'
     * 可以出现多次。
     *
     * @param {*} lineIdx
     * @param {*} key 项目名称
     * @param {*} value 项目值
     */
    constructor(lineIdx, key, value) {
        this.lineIdx = lineIdx;
        this.key = key;
        this.value = value;
    }
}

module.exports = FrontMatterItem;