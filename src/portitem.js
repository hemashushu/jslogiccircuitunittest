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

class PortItem extends AbstractPortItem{
    constructor(namePath) {
        super(namePath);
    }
}

class SlicePortItem extends AbstractPortItem {
    constructor(namePath, bitRanges) {
        super(namePath);

        // - ranges: [{bitHigh, bitLow}, ...] 数组
        // - ranges 的顺序跟脚本书写的顺序一致，即先写的
        //   范围（高位）先加入数组（索引值较小），后写的（低位）后加入
        //   数组（索引值较大）。
        this.bitRanges = bitRanges;
    }

    getTitle() {
        let rangeTexts = [];
        for(let bitRange of this.bitRanges) {
            if (bitRange.getBitWidth() === 1) {
                rangeTexts.push(bitRange.bitLow);
            }else {
                rangeTexts.push(`${bitRange.bitHigh}:${bitRange.bitLow}`);
            }
        }

        let rangeString = rangeTexts.join(', ');
        return `${this.namePath}[${rangeString}]`;
    }

    isValid() {
        let isNameValid = super.isValid();
        if (!isNameValid){
            return false;
        }

        // BitRange 的 bitHigh 必须 >= bitLow
        for(let bitRange of this.bitRanges) {
            if (bitRange.bitHigh < bitRange.bitLow) {
                return false;
            }
        }

        return true;
    }
}

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
        for(let portItem of this.childPortItems) {
            childPortTitles.push(portItem.getTitle());
        }
        let childPortString = childPortTitles.join(', ');
        return `{${childPortString}}`;
    }

    isValid() {
        for(let portItem of this.childPortItems) {
            if (!portItem.isValid()) {
                return false;
            }
        }

        return true;
    }
}

module.exports = {
    PortItem,
    SlicePortItem,
    CombinedPortItem
};