const AbstractPortItem = require('./abstractportitem');

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
        for (let bitRange of this.bitRanges) {
            if (bitRange.getBitWidth() === 1) {
                rangeTexts.push(bitRange.bitLow);
            } else {
                rangeTexts.push(`${bitRange.bitHigh}:${bitRange.bitLow}`);
            }
        }

        let rangeString = rangeTexts.join(', ');
        return `${this.namePath}[${rangeString}]`;
    }

    isValid() {
        let isNameValid = super.isValid();
        if (!isNameValid) {
            return false;
        }

        // BitRange 的 bitHigh 必须 >= bitLow
        for (let bitRange of this.bitRanges) {
            if (bitRange.bitHigh < bitRange.bitLow) {
                return false;
            }
        }

        return true;
    }
}

module.exports = SlicePortItem;