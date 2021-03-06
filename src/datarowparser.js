const ScriptParseException = require('./scriptparseexception');
const ParseErrorDetail = require('./parseerrordetail');
const ParseErrorCode = require('./parseerrorcode');

const DataRowItem = require('./datarowitem');
const DataRowItemType = require('./datarowitemtype');
const DataCellItem = require('./datacellitem');
const DataCellItemType = require('./datacellitemtype');

class DataRowParser {

    /**
     * 如果数据行有语法错误，则抛出 ScriptParseException 异常。
     *
     * @param {*} lineIdx
     * @param {*} lineText
     * @returns {
     *     dataRowItem: DataRowItem,
     *     isEnterGroup: Boolean,
     *     isLeaveGroup: Boolean} 对象
     */
    static parseLine(lineIdx, lineText) {
        if (/^\s*nop(\s*$|\s*#.*$)/.test(lineText)) {
            // parse 'nop'
            let nopDataRowItem = DataRowParser.parseNopRow(lineIdx, lineText);
            return { dataRowItem: nopDataRowItem };

        } else if (/^\s*repeat\s*\(/.test(lineText)) {
            // parse 'repeat'
            let repeatDataRowItem = DataRowParser.parseRepeatRow(lineIdx, lineText);
            return { dataRowItem: repeatDataRowItem };

        } else if (/^\s*for\s*\(/.test(lineText)) {
            // parse 'for'
            let forDataRowItem = DataRowParser.parseForRow(lineIdx, lineText);
            return {
                dataRowItem: forDataRowItem,
                isEnterGroup: true
            };

        } else if (/^\s*end(\s*$|\s*#.*$)/.test(lineText)) {
            // 跳出当前组
            return {
                isLeaveGroup: true
            };

        } else {
            // parse normal data row
            let dataRowItem = DataRowParser.parseDataRow(lineIdx, lineText);
            return {
                dataRowItem: dataRowItem
            };
        }
    }

    /**
     * 解析数据行
     *
     * @param {*} lineIdx
     * @param {*} rowText
     * @returns DataRowItem 对象，如果数据行有语法错误，则
     *     抛出 ScriptParseException 异常。
     */
    static parseDataRow(lineIdx, rowText) {
        // 数据行有可能几种数据：
        // 1. 普通数字，包括十进制（默认）、二进制、十六进制，有可能分段；
        // 2. 双引号包围起来的字符串；
        // 3. 括号包围起来的算术表达式；
        // 4. 注释。

        let cells = [];
        let cellBuffer = [];

        // 记录当前括号的嵌套层数。
        // 因为函数支持括号嵌套，所以需要一个变量记录当前的层数，以判断正确的
        // 结束括号。
        let bracketDeepth = 0;

        let state = 'expect-cell-start';
        for (let idx = 0; idx < rowText.length; idx++) {
            let c = rowText[idx];
            switch (state) {
                case 'expect-cell-start':
                    {
                        if (c === ' ') {
                            continue;
                        } else if (c === '(') {
                            cellBuffer.push(c);
                            bracketDeepth = 0; // 重置嵌套计数器
                            state = 'expect-bracket-end';
                        } else if (c === '"') {
                            cellBuffer.push(c);
                            state = 'expect-quote-end';
                        } else if (c === '#') {
                            idx = rowText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        } else {
                            cellBuffer.push(c);
                            state = 'expect-cell-end';
                        }
                        break;
                    }

                case 'expect-cell-end':
                    {
                        if (c === ' ') {
                            let cell = cellBuffer.join('');
                            cells.push(cell);
                            cellBuffer = [];
                            state = 'expect-cell-start';
                        } else if (c === '#') {
                            idx = rowText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        } else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-bracket-end':
                    {
                        if (c === '(') {
                            cellBuffer.push(c);
                            bracketDeepth++; // 嵌套括号开始
                        } else if (c === ')') {
                            if (bracketDeepth === 0) {
                                cellBuffer.push(c);
                                let cell = cellBuffer.join('');
                                cells.push(cell);
                                cellBuffer = [];
                                state = 'expect-space';
                            } else {
                                bracketDeepth--; // 嵌套括号结束
                                cellBuffer.push(c);
                            }

                        } else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-quote-end':
                    {
                        if (c === '"') {
                            cellBuffer.push(c);
                            let cell = cellBuffer.join('');
                            cells.push(cell);
                            cellBuffer = [];
                            state = 'expect-space';
                        } else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-space':
                    {
                        if (c === ' ') {
                            state = 'expect-cell-start';
                        } else {
                            throw new ScriptParseException(
                                'Expect space between data cells.',
                                new ParseErrorDetail(ParseErrorCode.syntaxError,
                                    'expect-space-between-data-cells',
                                    lineIdx, idx));
                        }
                        break;
                    }
            }
        }

        if (state === 'expect-cell-end') {
            let cell = cellBuffer.join('');
            cells.push(cell);
        } else if (
            state === 'expect-cell-start' ||
            state === 'expect-space') {
            //
        } else {
            throw new ScriptParseException(
                'Data row syntax error',
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'data-row-syntax-error',
                    lineIdx));
        }

        let dataCellItems = [];
        for (let cell of cells) {
            let dataCellItem = DataRowParser.convertToDataCellItem(lineIdx, cell);
            dataCellItems.push(dataCellItem);
        }

        // 生成一个数据 DataRowItem 对象。
        return new DataRowItem(DataRowItemType.data, lineIdx, dataCellItems);
    }

    static parseRepeatRow(lineIdx, rowText) {
        // repeat 语句示例：
        //
        // repeat(256, i)  i  2  (i*2)
        // repeat 关键字后面括号里面分别是重复次数和变量名称，变量名称可省略。
        // 后面则是普通的数据行内容。
        //
        // 匹配的正则表达式为：
        // ^\s*repeat\s*\(
        // \s*(\d+)\s*
        // (,\s*([a-z][a-z0-9_]*)\s*)?
        // \)\s+(.+)$

        let match = /^\s*repeat\s*\(\s*(\d+)\s*(,\s*([a-z][a-z0-9_]*)\s*)?\)\s+(.+)$/.exec(rowText);
        if (match === null) {
            throw new ScriptParseException(
                'Data row statement "repeat" syntax error',
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'statement-repeat-syntax-error', lineIdx));
        }

        let repeatCount = Number(match[1]);
        let variableName = match[3]; // 可能为 undefined
        if (variableName !== undefined) {
            variableName = variableName.trim();
        }
        let subDataRowText = match[4];

        let {
            dataRowItem: subDataRowItem,
            isEnterGroup,
            isLeaveGroup
        } = DataRowParser.parseLine(lineIdx, subDataRowText);

        if (isEnterGroup || isLeaveGroup) {
            throw new ScriptParseException(
                'Data row statement "repeat" syntax error',
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'statement-repeat-syntax-error', lineIdx));
        }

        // 生成一个 childDataRowItems 属性值为单一条 DataRowItem 的
        // DataRowItem 对象。
        return new DataRowItem(DataRowItemType.group, lineIdx, undefined,
            variableName, 0, repeatCount - 1, [subDataRowItem]);
    }

    static parseForRow(lineIdx, rowText) {
        // 寻找注释符号
        let pos = rowText.indexOf('#');
        if (pos > 0) {
            rowText = rowText.substring(0, pos);
        }

        rowText = rowText.trim(); // 去头去尾

        // for 语句示例：
        //
        // for(i, 0, 256)
        //
        // 匹配的正则表达式为：
        // ^for\s*\(
        // \s*([a-z][a-z0-9_]*)\s*
        // ,
        // \s*([\d_]+|0b[01_]+|0x[0-9a-f_]+)\s*
        // ,
        // \s*([\d_]+|0b[01_]+|0x[0-9a-f_]+)\s*
        // \)$

        let match = /^for\s*\(\s*([a-z][a-z0-9_]*)\s*,\s*([\d_]+|0b[01_]+|0x[0-9a-f_]+)\s*,\s*([\d_]+|0b[01_]+|0x[0-9a-f_]+)\s*\)$/.exec(rowText);
        if (match === null) {
            throw new ScriptParseException(
                'Data row statement "for" syntax error',
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'statement-for-syntax-error', lineIdx));
        }

        let variableName = match[1].trim();
        let from = Number(match[2].replace(/_/g, ''));
        let to = Number(match[3].replace(/_/g, ''));

        // 生成一个 childDataRowItems 属性值为空数组的 DataRowItem 对象，返回
        // 主脚本解析程序会填充 childDataRowItems。
        return new DataRowItem(DataRowItemType.group, lineIdx, undefined,
            variableName, from, to);
    }

    static parseNopRow(lineIdx) {
        return new DataRowItem(DataRowItemType.nop, lineIdx, undefined);
    }

    /**
     * 如果单元格数据格式有错误，会抛出 ScriptParseException 异常。
     * 注意算术表达式需要在测试过程中才检查是否有语法有误。
     *
     * @param {*} lineIdx
     * @param {*} cellText
     * @returns
     */
    static convertToDataCellItem(lineIdx, cellText) {
        if (cellText.startsWith('"')) {
            // 字符串
            let cellTextContent = cellText.substring(1, cellText.length - 1);
            return DataRowParser.convertToStringDataCellItem(cellTextContent);
        } else if (cellText.startsWith('(')) {
            // 算术表达式
            let cellTextContent = cellText.substring(1, cellText.length - 1);
            return DataRowParser.convertToArithmeticDataCellItem(cellTextContent);
        } else if (cellText === 'z') {
            // 高阻抗
            return DataRowParser.convertToHighZDataCellItem();
        } else if (cellText === 'x') {
            // 忽略值
            return DataRowParser.convertToIgnoreDataCellItem();
        } else if (/^[a-z][a-z0-9_]*$/.test(cellText)) {
            // 变量值
            return DataRowParser.convertToArithmeticDataCellItem(cellText);
        } else {
            return DataRowParser.convertToNumberDataCellItem(lineIdx, cellText);
        }
    }

    /**
     * 如果数字格式错误，会抛出 ScriptParseException 异常。
     *
     * @param {*} lineIdx
     * @param {*} cellTextContent
     * @returns
     */
    static convertToNumberDataCellItem(lineIdx, cellTextContent) {
        let binaryString;
        let highZString;

        if (cellTextContent.startsWith('0b')){
            let binaryBuffer = [];
            let highZBuffer = [];
            for(let idx=2;idx<cellTextContent.length;idx++) {
                let char = cellTextContent[idx];
                if (char === 'z') {
                    binaryBuffer.push('0');
                    highZBuffer.push('1');
                }else if (char === '0' || char === '1'){
                    binaryBuffer.push(char);
                    highZBuffer.push('0');
                }else {
                    throw new ScriptParseException(
                        'Binary data syntax error in data row',
                        new ParseErrorDetail(ParseErrorCode.syntaxError,
                            'number-syntax-error', lineIdx, undefined, {
                                text: cellTextContent
                            }));
                }
            }

            binaryString = '0b' + binaryBuffer.join('');
            highZString = '0b' + highZBuffer.join('');

        }else if (cellTextContent.startsWith('0x')){
            let binaryBuffer = [];
            let highZBuffer = [];
            for(let idx=2;idx<cellTextContent.length;idx++) {
                let char = cellTextContent[idx];
                if (char === 'z') {
                    binaryBuffer.push('0');
                    highZBuffer.push('f');
                }else if (char >= '0' && char <='9' || char >= 'a' && char <= 'f'){
                    binaryBuffer.push(char);
                    highZBuffer.push('0');
                }else {
                    throw new ScriptParseException(
                        'Hex data syntax error in data row',
                        new ParseErrorDetail(ParseErrorCode.syntaxError,
                            'number-syntax-error', lineIdx, undefined, {
                                text: cellTextContent
                            }));
                }
            }

            binaryString = '0x' + binaryBuffer.join('');
            highZString = '0x' + highZBuffer.join('');

        }else {
            binaryString = cellTextContent;
            highZString = '0';
        }

        let binary = Number(binaryString);
        let highZ = Number(highZString);

        if (isNaN(binary) || isNaN(highZ)) {
            throw new ScriptParseException(
                'Number syntax error in data row',
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'number-syntax-error', lineIdx, undefined, {
                        text: cellTextContent
                    }));
        }

        return new DataCellItem(DataCellItemType.number, {
            binary: binary,
            highZ: highZ
        });
    }

    static convertToStringDataCellItem(cellTextContent) {
        return new DataCellItem(DataCellItemType.string, cellTextContent);
    }

    static convertToArithmeticDataCellItem(cellTextContent) {
        return new DataCellItem(DataCellItemType.arithmetic, cellTextContent);
    }

    static convertToHighZDataCellItem() {
        return new DataCellItem(DataCellItemType.highZ);
    }

    static convertToIgnoreDataCellItem() {
        return new DataCellItem(DataCellItemType.ignore);
    }
}

module.exports = DataRowParser;