const { ParseException } = require('jsexception');

const DataRowItem = require('./datarowitem');

class DataRowParser {

    static parseDataRow(lineIdx, rowText) {
        // 数据行有可能几种数据：
        // 1. 普通数字，包括十进制（默认）、二进制、十六进制，有可能分段；
        // 2. 双引号包围起来的字符串；
        // 3. 括号包围起来的算术表达式；
        // 4. 注释。

        let cells = [];
        let cellBuffer = [];

        let state = 'expect-cell-start';
        for(let idx=0; idx<rowText.length; idx++) {
            let c = rowText[idx];
            switch(state){
                case 'expect-cell-start':
                    {
                        if (c === ' ') {
                            continue;
                        }else if (c==='(') {
                            cellBuffer.push(c);
                            state = 'expect-bracket-end';
                        }else if (c==='"') {
                            cellBuffer.push(c);
                            state = 'expect-quote-end';
                        }else if (c==='#') {
                            idx=rowText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        }else {
                            cellBuffer.push(c);
                            state = 'expect-cell-end';
                        }
                        break;
                    }

                case 'expect-cell-end':
                    {
                        if (c===' ') {
                            let cell = cellBuffer.join('');
                            cells.push(cell);
                            cellBuffer = [];
                            state = 'expect-cell-start';
                        }else if(c==='#') {
                            idx=rowText.length;
                            break; // 遇到注释字符，需要退出 for 循环
                        }else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-bracket-end':
                    {
                        if(c===')') {
                            cellBuffer.push(c);
                            let cell = cellBuffer.join('');
                            cells.push(cell);
                            cellBuffer = [];
                            state = 'expect-space';
                        }else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-quote-end':
                    {
                        if(c==='"') {
                            cellBuffer.push(c);
                            let cell = cellBuffer.join('');
                            cells.push(cell);
                            cellBuffer = [];
                            state = 'expect-space';
                        }else {
                            cellBuffer.push(c);
                        }
                        break;
                    }

                case 'expect-space':
                    {
                        if (c===' ') {
                            state = 'expect-cell-start';
                        }else {
                            throw new ParseException(
                                'Expect space between data cells, at line: ' + (lineIdx + 1) +
                                ', position: ' + (idx +1));
                        }
                        break;
                    }
            }
        }

        if (state === 'expect-cell-end') {
            let cell = cellBuffer.join('');
            cells.push(cell);
        }else if (
            state === 'expect-cell-start' ||
            state === 'expect-space') {
            //
        }else {
            throw new ParseException(
                'Data row syntax error, at line: ' + (lineIdx + 1));
        }

        console.log('>>>>>>>>>>>>');
        console.log(cells);

        return new DataRowItem();
    }

    static parseRepeatRow(lineIdx, rowText) {
        // 寻找注释符号
        let pos = rowText.indexOf('#');
        if (pos > 0) {
            rowText = rowText.substring(0, pos);
            rowText = rowText.trim();
        }

        return new DataRowItem();
    }

    static parseLoopRow(lineIdx, rowText) {
        // 寻找注释符号
        let pos = rowText.indexOf('#');
        if (pos > 0) {
            rowText = rowText.substring(0, pos);
            rowText = rowText.trim();
        }

        return new DataRowItem();
    }

    static parseNopRow(lineIdx, towText) {
        // 寻找注释符号
        let pos = rowText.indexOf('#');
        if (pos > 0) {
            rowText = rowText.substring(0, pos);
            rowText = rowText.trim();
        }

        return new DataRowItem();
    }
}

module.exports = DataRowParser;