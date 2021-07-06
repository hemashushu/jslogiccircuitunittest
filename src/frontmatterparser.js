const { ParseException } = require('jsexception');

class FrontMatterParser {
    /**
     * 解析测试脚本的头信息（Front-Matter）
     *
     * 头信息的结构及内容如下（行前的数字和点号用于表示，
     * 行号，实际的头信息内容不存在）：
     *
     * 1. ---
     * 2. key1: value1
     * 3. key2: value2
     * 4. ---
     *
     * 第 1 行和第 4 行的 3 个连续减号（-）用于表示头信息的开始和结束。
     * 中间为头信息的主体内容，每行的格式为 “key: value”，
     * 即键名加冒号，然后是键值。键值只支持 3 种数据类型：
     *
     * - 数字，如 123, 0b0101，0xaabb00ff
     * - 布尔，如 true，false
     * - 字符串，如 "abc"， "foo bar"， "Hello World!"
     *
     * 其中字符串的双引号在无歧义的情况下可以省略。
     *
     * @param {*} lineIdx
     * @param {*} lineText 头信息文本的单一行内容
     * @returns
     */
    static parseLine(lineIdx, lineText) {
        let pos = lineText.indexOf(':');
        if (pos <= 0) {
            throw new ParseException(
                'Front-Matter syntax error, at line: ' + (lineIdx + 1));
        }

        let key = lineText.substring(0, pos).trim(); // 去除头尾空格
        let value;

        let valueString = lineText.substring(pos + 1).trim(); // 去除头尾空格

        if (valueString.startsWith('"')) {
            // 有双引号包围的字符类型的值

            // 寻找双引号结束的位置
            let quotePos = valueString.indexOf('"', 1);
            if (quotePos < 0) {
                throw new ParseException(
                    'The ending quote was not found in the value of the Front-Matter field, at line: ' + (lineIdx + 1));
            }

            value = valueString.substring(1, quotePos);

        }else {
            // 寻找注释符号的位置
            let pos = valueString.indexOf('#');
            if (pos > 0) {
                valueString = valueString.substring(0, pos);
                valueString = valueString.trim(); // 去除尾部空格
            }

            // 尝试转换为数字（注意数字间可能有分段符号 “_”）
            let numberValue = Number(valueString.replace(/_/g, ''));

            if (!isNaN(numberValue)) {
                // 数字类型的值
                value = numberValue;

            } else if (/^true|false$/i.test(valueString)) {
                // Boolean 类型
                value = (valueString.toUpperCase() === 'TRUE');

            } else {
                // 字符类型的值
                value = valueString;
            }
        }

        return {
            key: key,
            value: value
        };
    }
}

module.exports = FrontMatterParser;