const path = require('path');

const { PromiseTextFile } = require('jstextfile');
const { ObjectUtils } = require('jsobjectutils');

const DataRowItem = require('./datarowitem');
const DataRowItemType = require('./datarowitemtype');
const DataRowParser = require('./datarowparser');
const FrontMatterParser = require('./frontmatterparser');
const FrontMatterResolver = require('./frontmatterresolver');
const ParseErrorCode = require('./parseerrorcode');
const ParseErrorDetail = require('./parseerrordetail');
const PortListParser = require('./portlistparser');
const ScriptItem = require('./scriptitem');
const ScriptParseException = require('./scriptparseexception');

const SCRIPT_FILE_EXTENSION_NAME = '.test.txt';

class ScriptParser {
    /**
     *
     * - 如果脚本有语法错误，会抛出 ScriptParseException 异常。
     * - 如果参数外部文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果参数外部文件读取失败，则抛出 IOException 异常。
     *
     * @param {*} filePath
     * @returns
     */
    static async parseFile(filePath) {
        let fileName = path.basename(filePath);
        let scriptName = fileName;

        if (fileName.endsWith(SCRIPT_FILE_EXTENSION_NAME)) {
            scriptName = fileName.substring(0, fileName.length - SCRIPT_FILE_EXTENSION_NAME.length);
        }

        let { textContent } = await PromiseTextFile.read(filePath);
        return await ScriptParser.parse(textContent, scriptName, filePath);
    }

    /**
     *
     * - 如果脚本有语法错误，会抛出 ScriptParseException 异常。
     * - 如果参数外部文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果参数外部文件读取失败，则抛出 IOException 异常。
     *
     * @param {*} textContent
     * @param {*} scriptName 脚本的名称，可选
     * @param {*} scriptFilePath 脚本的本地文件路径，可选
     * @returns ScriptItem 对象
     */
    static async parse(textContent, scriptName, scriptFilePath) {
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
                throw new ScriptParseException(
                    'Can not find the corresponding for statement',
                    new ParseErrorDetail(ParseErrorCode.syntaxError,
                        'statement-end-syntax-error', lineIdx));
            }
            dataRowItemStack.pop();
            currentGroup = dataRowItemStack[dataRowItemStack.length - 1];
        };

        let appendDataRowItem = (dataRowItem) => {
            currentGroup.childDataRowItems.push(dataRowItem);
        };

        // push the root group into stack
        enterGroup(rootDataRowItem);

        let lineTexts = textContent.split('\n').map(line => {
            return line.trim();
        });

        let state = 'expect-fm-start-or-portlist'; // front-matter or port list
        for (let lineIdx = 0; lineIdx < lineTexts.length; lineIdx++) {
            let lineText = lineTexts[lineIdx];

            if (lineText === '' ||
                lineText.startsWith('#')) {
                continue;
            }

            switch (state) {
                case 'expect-fm-start-or-portlist':
                    {
                        if (lineText === '---') {
                            state = 'expect-fm-end';
                        } else {
                            portItems = PortListParser.parse(lineIdx, lineText);
                            state = 'expect-data-row';
                        }
                        break;
                    }

                case 'expect-fm-end':
                    {
                        if (lineText === '---') {
                            state = 'expect-portlist';
                        } else {
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
                        let {
                            dataRowItem,
                            isEnterGroup,
                            isLeaveGroup
                        } = DataRowParser.parseLine(lineIdx, lineText);

                        if (isLeaveGroup === true) {
                            leaveGroup(lineIdx);
                        } else if (isEnterGroup) {
                            appendDataRowItem(dataRowItem);
                            enterGroup(dataRowItem);
                        } else {
                            appendDataRowItem(dataRowItem);
                        }
                        break;
                    }
            }
        }

        let frontMatter = ObjectUtils.collapseKeyValueArray(frontMatterItems, 'key', 'value');

        // 解析诸如的头信息值：
        // object(file:file_name.yaml)
        // binary(file:file_name.bin)
        // - 如果文件内容为空或者无实际数据，会抛出 ScriptParseException。
        // - 如果文件不存在，则抛出 FileNotFoundException 异常。
        // - 如果读取文件失败，则抛出 IOException 异常。
        let resolvedFrontMatter = await FrontMatterResolver.resolve(frontMatter, scriptFilePath);

        let scriptItem = new ScriptItem(scriptName,
            scriptFilePath,
            resolvedFrontMatter,
            portItems, rootDataRowItem.childDataRowItems);
        return scriptItem;
    }
}

module.exports = ScriptParser;