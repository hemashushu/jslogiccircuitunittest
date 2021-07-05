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
        // ranges: [{bitHigh, bitLow}, ...]
        super(namePath);
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

        // // bitRanges 数组中的元素是 “从高位到低位” 的顺序排序。
        // for(let idx=this.bitRanges.length - 1; idx>0; idx--) {
        //     let highBitRange = this.bitRanges[idx];
        //     let lowBitRange = this.bitRanges[idx - 1];
        //     if (highBitRange.bitLow < lowBitRange.bitHigh) {
        //         return false;
        //     }
        // }

        return true;
    }
}

class CombinedPortItem extends AbstractPortItem {
    constructor(abstractPortItems) {
        super('');
        this.portItems = abstractPortItems;
    }

    getTitle() {
        let childPortTitles = [];
        for(let portItem of this.portItems) {
            childPortTitles.push(portItem.getTitle());
        }
        let childPortString = childPortTitles.join(', ');
        return `{${childPortString}}`;
    }

    isValid() {
        for(let portItem of this.portItems) {
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