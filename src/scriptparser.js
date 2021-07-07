const path = require('path');

const { PromiseTextFile } = require('jstextfile');
const {ObjectUtils} = require('jsobjectutils');

const { ParseException } = require('jsexception');

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

        let dataRowItemStack = [];
        // dataStack = [group1, group2, ...]
        //
        // DataRowItem {
        //   type='group/data/nop',
        //   textContent='',
        //   variableName = 'a',
        //   from=0,
        //   to=100,
        //   dataRowItems=[]
        // }

        let rootDataRowItem = new DataRowItem(DataRowItemType.group);
        let currentGroup;

        let enterGroup = (groupDataRowItem) => {
            currentGroup = groupDataRowItem;
            dataRowItemStack.push(groupDataRowItem);
        };

        let leaveGroup = (lineIdx) => {
            if (dataRowItemStack.length <= 1) {
                throw new ParseException(
                    'Exceeded "for" statement, at line: ' + (lineIdx + 1));
            }
            dataRowItemStack.pop();
            currentGroup = dataRowItemStack[dataRowItemStack.length - 1];
        };

        let appendDataRowItem = (dataRowItem) => {
            currentGroup.dataRowItems.push(dataRowItem);
        };

        // push the root group into stack
        enterGroup(rootDataRowItem);

        let lineTexts = textContent.split('\n').map(line => {
            return line.trim();
        });

        let state = 'expect-fm-start-or-portlist'; // front-matter or port list
        for(let lineIdx = 0; lineIdx< lineTexts.length; lineIdx++) {
            let lineText = lineTexts[lineIdx];

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
                            portItems = PortListParser.parse(lineIdx, lineText);
                            state = 'expect-data-row';
                        }
                        break;
                    }

                case 'expect-fm-end':
                    {
                        if (lineText === '---') {
                            state = 'expect-portlist';
                        }else {
                            let frontMatter = FrontMatterParser.parseLine(lineIdx, lineText);
                            frontMatterItems.push(frontMatter);
                        }
                        break;
                    }

                case 'expect-portlist':
                    {
                        portItems = PortListParser.parse(lineIdx, lineText);
                        state = 'expect-data-row';
                        break;
                    }

                case 'expect-data-row':
                    {
                        if (/^\s*nop(\s*$|\s*#.*$)/.test(lineText)) {
                            // parse 'nop'
                            let nopDataRow = DataRowParser.parseNopRow(lineIdx, lineText);
                            appendDataRowItem(nopDataRow);

                        }else if (/^\s*repeat\s*\(/.test(lineText)) {
                            // parse 'repeat'
                            let repeatDataRow = DataRowParser.parseRepeatRow(lineIdx, lineText);
                            appendDataRowItem(repeatDataRow);

                        }else if (/^\s*for\s*\(/.test(lineText)) {
                            // parse 'for'
                            let forDataRow = DataRowParser.parseForRow(lineIdx, lineText);
                            appendDataRowItem(forDataRow);
                            enterGroup(forDataRow);

                        }else if (/^\s*end(\s*$|\s*#.*$)/.test(lineText)){
                            // 跳出当前组
                            leaveGroup(lineIdx);

                        }else {
                            // parse normal data row
                            let dataRow = DataRowParser.parseDataRow(lineIdx, lineText);
                            appendDataRowItem(dataRow);
                        }

                        break;
                    }
            }
        }

        let frontMatter = ObjectUtils.collapseKeyValueArray(frontMatterItems, 'key', 'value');

        let scriptItem = new ScriptItem(scriptName, frontMatter, portItems, rootDataRowItem.dataRowItems);
        return scriptItem;
    }
}

module.exports = TestScriptParser;