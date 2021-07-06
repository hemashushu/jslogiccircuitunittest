const { ParseException } = require('jsexception');

const {BitRange} = require('jslogiccircuit');

const {
    PortItem,
    SlicePortItem,
    CombinedPortItem
} = require('./portitem');

class PortListParser {
    /**
     * 解析测试脚本当中的端口列表
     *
     * - 端口列表由一个或多个端口名称，以空格间隔组成的一行文本。
     *   端口的名称只允许 [a-zA-Z0-9_\$] 字符组成，且只能由 [a-zA-Z_] 开头，如：
     *   A, AB, Q, Cin, Cout, a$c, in_1, _Q
     *
     * - 当端口名称也可以使用双引号包围起来，如：
     *   "gate_in", "gate$out"
     *
     * - 如果要表示模块内部的子模块的端口，可以使用点号将子模块的名称附加在端口
     *   名称的前面，如：
     *   and1.A, halfAdder1.C, ALU1.fullAdder1.Cin, mux1."gata$out"
     *
     * - 如果一个端口的位宽大于 1，可以只选取该端口部分位的数据，比如一个 16 位
     *   的端口 A，可以只选取其中的 8 位（比如从第 0 位到第 7 位）作为
     *   输入或者检测输出，则可以写作 A[7:0]，其中中括号内部的两个数字表示数据位的
     *   范围，需要注意先写高位再写低位，而且两位所对应的数据都是包括的。
     *   也可以单独只选取其中的一位，比如选取第 10 位的写法为 A[10]。
     *   以下都是合法的表示：
     *   Q[16:12], Q[16]， halfAdder1.S[15:8]，halfAdder1.S[24]
     *
     * - 也可以一次选择多个不连续的范围，在中括号里使用逗号分隔多个范围即可，比如：
     *   Q[24, 22, 7:0]， A[5,3,1]
     *   范围值允许有重叠，多个范围值的顺序可随意。
     *
     * - 可以把多个端口的数据拼接成一个端口，使用一对花括号（{ 和 }）把多个端口名称包围
     *   起来，然后端口名称之间使用逗号分隔，比如：
     *   {A, B}，{A3, A2, A1, A0}
     *
     * - 拼接里面允许包含部分选取，比如：
     *   {A, B[7:0], Cin[5,3]}
     *
     * - 不支持嵌套拼接，比如：
     *   {A, {C, D}} **不支持**
     *
     * - 不支持拼接后再部分选取，比如：
     *   {A, B}[14:12] **不支持**
     *
     * - 如果端口列表语法有误，会抛出 ParseException 异常。
     *
     * @param {*} lineIdx
     * @param {*} lineText
     * @returns
     */
    static parse(lineIdx, lineText) {

        // 先将端口文本的按空格分割成端口列表，
        // 因为端口名称允许“拼接”和“部分选取”，其中也可能会存在空格，
        // 下面过程用于分析正确的分隔点。

        let portTexts = [];
        let portTextBuffer = [];

        let state = 'expect-port-start';

        for(let idx=0; idx<lineText.length; idx++) {
            let c = lineText[idx];

            switch(state) {
                case 'expect-port-start':
                    {
                        if (c===' ') {
                            continue;
                        }else if (c==='{') {
                            portTextBuffer.push(c);
                            state = 'expect-curly-bracket-end';
                        }else if(c==='"') {
                            state = 'expect-double-quote-end';
                        }else if (c==='#') {
                            idx = lineText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        }else{
                            portTextBuffer.push(c);
                            state = 'expect-port-end';
                        }
                        break;
                    }

                case 'expect-port-end':
                    {
                        if (c==='[') {
                            portTextBuffer.push(c);
                            state = 'expect-square-bracket-end';
                        }else if (c==='.') {
                            portTextBuffer.push(c);
                            state = 'expect-sub-port-start';
                        }else if(c===' ') {
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-port-start';
                        }else if (c==='#') {
                            idx = lineText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-square-bracket-end':
                    {
                        if (c===']') {
                            portTextBuffer.push(c);
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-space';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-curly-bracket-end':
                    {
                        if (c==='}') {
                            portTextBuffer.push(c);
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-space';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-space':
                    {
                        if (c === ' ') {
                            state = 'expect-port-start';
                        }else {
                            throw new ParseException('Expect space between port names, at line: ' + (lineIdx+1) +
                                ', position: ' + (idx + 1));
                        }
                        break;
                    }

                case 'expect-double-quote-end':
                    {
                        if (c==='"') {
                            portTextBuffer.push(c);
                            state = 'expect-next-port-or-sub-port-start-or-square-bracket-start';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-next-port-or-sub-port-start-or-square-bracket-start': // 遇到双引号结束之后
                    {
                        if (c==='.') {
                            portTextBuffer.push(c);
                            state = 'expect-sub-port-start';
                        }else if (c=== '[') {
                            portTextBuffer.push(c);
                            state = 'expect-square-bracket-end';
                        }else if (c===' '){
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-port-start';
                        }else if (c==='#') {
                            idx = lineText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        }else {
                            throw new ParseException(
                                'Expect port name start, at line: ' + (lineIdx + 1) +
                                ', position: ' + (idx + 1));
                        }
                        break;
                    }

                case 'expect-sub-port-start': // 遇到点号（.）之后
                    {
                        if (c === '"') {
                            state = 'expect-double-quote-end';
                        }else {
                            portTextBuffer.push(c);
                            state = 'expect-port-end';
                        }
                        break;
                    }
            }
        }

        if (state === 'expect-port-end') {
            let name = portTextBuffer.join('');
            portTexts.push(name);
        }else if(
            state === 'expect-port-start' ||
            state === 'expect-next-port-or-sub-port-start-or-square-bracket-start'){
            //
        }else {
            throw new ParseException(
                'Port list syntax error, at line: ' + (lineIdx + 1));
        }

        let portItems = portTexts.map(portText => {
            return PortListParser.convertToAbstractPortItem(portText);
        });

        // 检查端口语法
        for(let portItem of portItems) {
            if (!portItem.isValid()) {
                throw new ParseException(
                    'Port name syntax error, text: "' + portItem.getTitle() + '"');
            }
        }

        return portItems;
    }

    static convertToAbstractPortItem(portText) {
        if (portText.startsWith('{')) {
            return PortListParser.convertToCombinedPortItem(portText);

        }else if (portText.indexOf('[')>0) {
            return PortListParser.convertToSlicePortItem(portText);

        }else {
            return PortListParser.convertToPortItem(portText);
        }
    }

    static convertToCombinedPortItem(portText) {
        // e.g.
        // {A, B, C}
        // {A[7:0], B, C[14,12,4:0]}
        let textContent = portText.substring(1, portText.length - 1);
        let portTexts = [];
        let portTextBuffer = [];

        let state = 'expect-port-start';

        for(let idx=0; idx<textContent.length; idx++) {
            let c = textContent[idx];

            switch(state) {
                case 'expect-port-start':
                    {
                        if (c===' ') {
                            continue;
                        }else if(c==='"') {
                            state = 'expect-double-quote-end';
                        }else{
                            portTextBuffer.push(c);
                            state = 'expect-port-end';
                        }
                        break;
                    }

                case 'expect-port-end':
                    {
                        if (c==='[') {
                            portTextBuffer.push(c);
                            state = 'expect-square-bracket-end';
                        }else if (c==='.') {
                            portTextBuffer.push(c);
                            state = 'expect-sub-port-start';
                        }else if(c===',') {
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-port-start';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-square-bracket-end':
                    {
                        if (c===']') {
                            portTextBuffer.push(c);
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-comma';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-comma':
                    {
                        if (c===' ') {
                            //
                        }else if (c===',') {
                            state = 'expect-port-start';
                        }
                        break;
                    }

                case 'expect-double-quote-end':
                    {
                        if (c==='"') {
                            portTextBuffer.push(c);
                            state = 'expect-comma-or-sub-port-start-or-square-bracket-start';
                        }else {
                            portTextBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-comma-or-sub-port-start-or-square-bracket-start': // 遇到双引号结束之后
                    {
                        if (c==='.') {
                            portTextBuffer.push(c);
                            state = 'expect-sub-port-start';
                        }else if (c=== '[') {
                            portTextBuffer.push(c);
                            state = 'expect-square-bracket-end';
                        }else if (c===','){
                            let name = portTextBuffer.join('');
                            portTexts.push(name);
                            portTextBuffer = [];
                            state = 'expect-port-start';
                        }else {
                            throw new ParseException(
                                'Port name syntax error, text: "' + portText + '", at position: ' + (idx+1));
                        }
                        break;
                    }

                case 'expect-sub-port-start': // 遇到点号（.）之后
                    {
                        if (c === '"') {
                            state = 'expect-double-quote-end';
                        }else {
                            portTextBuffer.push(c);
                            state = 'expect-port-end';
                        }
                        break;
                    }
            }
        }

        if (state === 'expect-port-end') {
            let name = portTextBuffer.join('');
            portTexts.push(name);
        }else if(
            state === 'expect-port-start' ||
            state === 'expect-comma' ||
            state === 'expect-comma-or-sub-port-start-or-square-bracket-start'){
            //
        }else {
            throw new ParseException('Port name syntax error, text: "' + portText + '"');
        }

        // 花括号里提取出来的端口名称可能包含有前后空格
        portTexts = portTexts.map(item=>{
            return item.trim();
        });

        let portItems = [];
        for(let portText of portTexts) {
            if (portText.indexOf('[')>0) {
                let portItem = PortListParser.convertToSlicePortItem(portText);
                portItems.push(portItem);

            }else {
                let portItem = PortListParser.convertToPortItem(portText);
                portItems.push(portItem);
            }
        }

        return new CombinedPortItem(portItems);
    }

    static convertToSlicePortItem(portText) {
        // e.g.
        // A[7:0], B[14,12:6,4:0]
        let pos = portText.indexOf('[');
        let namePath = portText.substring(0, pos);
        let bitRanges = [];

        let rangeString = portText.substring(pos + 1, portText.length - 1);
        let rangeTexts = rangeString.split(',').map(text => {
            return text.trim();
        });

        for(let rangeText of rangeTexts) {
            let spos = rangeText.indexOf(':');
            if (spos > 0) {
                let bitHigh = parseInt(rangeText.substring(0, spos), 10);
                let bitLow = parseInt(rangeText.substring(spos + 1), 10);
                let bitRange = new BitRange(bitHigh, bitLow);
                bitRanges.push(bitRange);
            }else {
                let bit = parseInt(rangeText);
                let bitRange = new BitRange(bit, bit);
                bitRanges.push(bitRange);
            }
        }

        return new SlicePortItem(namePath, bitRanges);
    }

    static convertToPortItem(portText) {
        // e.g.
        // A, B, Cin
        return new PortItem(portText);
    }
}

module.exports = PortListParser;