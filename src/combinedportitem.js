const AbstractPortItem = require('./abstractportitem');

class CombinedPortItem extends AbstractPortItem {
    constructor(childPortItems) {
        super(''); // 组合端口没有名称（但有标题）

        // - childPortItems: [AbstractPortItem, ...] 数组
        // - childPortItems 的顺序跟脚本书写的顺序一致，即先写
        //   的范围（高位）先加入数组（索引值较小），后写的（低位）后加入
        //   数组（索引值较大）。
        this.childPortItems = childPortItems;
    }

    getTitle() {
        let childPortTitles = [];
        for (let portItem of this.childPortItems) {
            childPortTitles.push(portItem.getTitle());
        }
        let childPortString = childPortTitles.join(', ');
        return `{${childPortString}}`;
    }

    isValid() {
        for (let portItem of this.childPortItems) {
            if (!portItem.isValid()) {
                return false;
            }
        }

        return true;
    }
}

module.exports = CombinedPortItem;