const path = require('path');

const { PromiseTextFile } = require('jstextfile');
const {ObjectUtils} = require('jsobjectutils');

const DataRowParser = require('./datarowparser');
const DataRowItem = require('./datarowitem');
const DataRowItemType = require('./datarowitemtype');
const PortListParser = require('./portlistparser');
const FrontMatterParser = require('./frontmatterparser');
const ScriptItem = require('./scriptitem');

class TestScriptParser {
    constructor() {
        //
    }

    static async parseFile(filePath) {
        let fileName = path.basename(filePath);
        let extName = path.extname(fileName);
        let scriptName = fileName.substring(0, fileName.length - extName.length);

        let {textContent} = await PromiseTextFile.read(filePath);
        return TestScriptParser.parse(scriptName, textContent);
    }

    /**
     *
     * @param {*} scriptName
     * @param {*} textContent
     * @returns ScriptItem 对象，如果脚本有语法错误，会抛出
     *     ParseException 异常。
     */
    static parse(scriptName, textContent) {
        let frontMatterItems = []; // [{key:..., value:...},...]
        let portItems;

        let dataRowStack = [];
        // dataStack = [group1, group2, ...]
        //
        // DataRow {
        //   type='group/data/nop',
        //   textContent='',
        //   variableName = 'a',
        //   from=0,
        //   to=100,
        //   rows=[]
        // }

        let rootDataRow = new DataRowItem(DataRowItemType.group);
        dataRowStack.push(rootDataRow);

        let currentGroup = rootDataRow;
        let enterGroup = (groupDataRow) => {
            currentGroup = groupDataRow;
            dataRowStack.push(groupDataRow);
        };

        let leaveGroup = () => {
            currentGroup = dataRowStack.pop();
        };

        let appendDataRow = (dataRow) => {
            currentGroup.rows.push(dataRow);
        };

        let lineTexts = textContent.split('\n').map(line => {return line.trim();});
        let state = 'expect-fm-start-or-portlist'; // front-matter or port list
        for(let lineText of lineTexts) {
            if (lineText === '' ||
                lineText.startsWith('#')) {
                continue;
            }

            switch(state) {
                case 'expect-fm-start-or-portlist':
                    {
                        if (lineText === '---'){
                            state = 'expect-fm-end';
                        }else {
                            portItems = PortListParser.parse(lineText);
                        }
                        break;
                    }

                case 'expect-fm-end':
                    {
                        if (lineText === '---') {
                            state = 'expect-portlist';
                        }else {
                            let frontMatter = FrontMatterParser.parseLine(lineText);
                            frontMatterItems.push(frontMatter);
                        }
                        break;
                    }

                case 'expect-portlist':
                    {
                        portItems = PortListParser.parse(lineText);
                        state = 'expect-data-row';
                        break;
                    }

                case 'expect-data-row':
                    {
                        if (/^nop\s*\(/.test(lineText)) {
                            // parse 'nop'
                            let nopDataRow = DataRowParser.parseNopRow(lineText);
                            appendDataRow(nopDataRow);

                        }else if (/^repeat\s*\(/.test(lineText)) {
                            // parse 'repeat'
                            let repeatDataRow = DataRowParser.parseRepeatRow(lineText);
                            appendDataRow(repeatDataRow);

                        }else if (/^for\s*\(/.test(lineText)) {
                            // parse 'for'
                            let loopDataRow = DataRowParser.parseLoopRow(lineText);
                            appendDataRow(loopDataRow);
                            enterGroup(loopDataRow);

                        }else if (/^end$/.test(lineText)){
                            // 跳出当前组
                            leaveGroup();

                        }else {
                            // parse normal data row
                            let dataRow = DataRowParser.parseDataRow(lineText);
                            appendDataRow(dataRow);
                        }

                        break;
                    }
            }
        }

        let frontMatter = ObjectUtils.collapseKeyValueArray(frontMatterItems, 'key', 'value');

        let scriptItem = new ScriptItem(scriptName, frontMatter, portItems, rootDataRow.rows);
        return scriptItem;
    }
}

module.exports = TestScriptParser;