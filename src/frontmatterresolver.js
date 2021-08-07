const path = require('path');

const fsPromise = require('fs/promises');

const { IOException, FileNotFoundException } = require('jsexception');
const { ObjectUtils } = require('jsobjectutils');
const { PromiseFileConfig, YAMLFileConfig } = require('jsfileconfig');

const FrontMatterItem = require('./frontmatteritem');
const ParseErrorCode = require('./parseerrorcode');
const ParseErrorDetail = require('./parseerrordetail');
const ScriptParseException = require('./scriptparseexception');

/**
 * 提取头信息（Front-Matter）的 "属性" 和 "配置参数"
 */
class FrontMatterResolver {

    /**
     *
     * - 将头信息解析为 {attributeItems, configParameters} （"属性" 和 "配置参数"）对象
     * - 解析配置参数里的外部值：
     *   - object(file:file_name.yaml)
     *   - binary(file:file_name.bin)
     *
     * attributeItems 是 FrontMatterItem 对象数组，configParameters 是一个 Map.
     *
     * 异常：
     * - 如果 YAML 对象文件解析失败，会抛出 ParseException。
     * - 如果文件内容为空或者无实际数据，会抛出 ScriptParseException。
     * - 如果文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果读取文件失败，则抛出 IOException 异常。
     *
     * @param {*} frontMatterItems [FrontMatterItem, ...]
     * @param {*} scriptFileDirectory
     * @returns {attributeItems, configParameters}
     */
    static async resolve(frontMatterItems, scriptFileDirectory) {
        let attributeItems = []; // List
        let configParameters = {}; // Map

        for (let frontMatterItem of frontMatterItems) {
            let { lineIdx, key, value } = frontMatterItem;

            // 以感叹号开始的键值对是属性
            if (key.startsWith('!')) {
                let keyName = key.substring(1);

                // 重新包装 FrontMatterItem
                let attributeItem = new FrontMatterItem(lineIdx, keyName, value);
                attributeItems.push(attributeItem);

            } else {
                configParameters[key] = value;
            }
        }

        let resolvedConfigParameters = await FrontMatterResolver.resolveConfigParameters(
            configParameters, scriptFileDirectory);

        return {
            attributeItems: attributeItems,
            configParameters: resolvedConfigParameters
        };
    }

    static async resolveConfigParameters(configParameters, scriptFileDirectory) {
        let resolvedConfigParameters = {};

        for (let key in configParameters) {
            let value = configParameters[key];

            // 解析 object(file:...) 以及 binary(file:...) 表达式
            if (typeof value === 'string') {
                let match = /^(object|binary)\s*\((.+)\)$/.exec(value);
                if (match === null) {
                    resolvedConfigParameters[key] = value;
                    continue;
                }

                let sourceType = match[1];
                let sourcePath = match[2].trim();
                resolvedConfigParameters[key] = await FrontMatterResolver.resolveFileValue(
                    sourceType, sourcePath, scriptFileDirectory);

            } else {
                resolvedConfigParameters[key] = value;
            }
        }

        return resolvedConfigParameters;
    }

    /**
     * 解析诸如的头信息值：
     * - object(file:file_name.yaml)
     * - binary(file:file_name.bin)
     *
     * @param {*} sourceType
     * @param {*} sourcePath
     * @param {*} scriptFileDirectory
     * @returns
     */
    static async resolveFileValue(sourceType, sourcePath, scriptFileDirectory) {
        if (!sourcePath.startsWith('file:')) {
            throw new ScriptParseException(
                `Unsupport source type for front-matter field: ${key}.`,
                new ParseErrorDetail(ParseErrorCode.syntaxError,
                    'unsupport-source-type', undefined, undefined, {
                    key: key,
                    sourceType: sourceType
                }));
        }

        let sourceFileName = sourcePath.substring('file:'.length);
        let sourceFilePath = path.join(scriptFileDirectory, sourceFileName);

        let sourceValue = await FrontMatterResolver.loadSourceFile(
            sourceType, sourceFilePath);

        return sourceValue;
    }

    static async loadSourceFile(sourceType, sourceFilePath) {
        if (sourceType === 'object') {
            return await FrontMatterResolver.loadObjectSourceFile(sourceFilePath);
        } else if (sourceType === 'binary') {
            return await FrontMatterResolver.loadBinarySourceFile(sourceFilePath);
        }
    }

    /**
     * - 如果 YAML 对象文件解析失败，会抛出 ParseException。
     * - 如果文件内容为空或者无实际数据，会抛出 ScriptParseException。
     * - 如果文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果读取文件失败，则抛出 IOException 异常。
     *
     * @param {*} sourceFilePath
     * @returns 一个数据对象或者数据数组，
     */
    static async loadObjectSourceFile(sourceFilePath) {
        let fileConfig = new YAMLFileConfig();
        let promiseFileConfig = new PromiseFileConfig(fileConfig);

        // 如果文件内容为空，value 的值为 undefined
        // 如果文件无实际数据，value 的值为 null
        let config = await promiseFileConfig.load(sourceFilePath);

        if (config === undefined || config === null) {
            throw new ScriptParseException(
                `The front-matter object source file is empty.`,
                new ParseErrorDetail(ParseErrorCode.emptyObjectSourceFile,
                    'empty-object-source-file', undefined, undefined, {
                    filePath: sourceFilePath
                }));
        }

        return config;
    }

    /**
     * - 如果文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果读取文件失败，则抛出 IOException 异常。
     * @param {*} sourceFilePath
     * @returns Nodejs 的 Buffer 对象
     */
    static async loadBinarySourceFile(sourceFilePath) {
        // https://nodejs.org/api/fs.html#fs_fspromises_readfile_path_options
        try {
            return await fsPromise.readFile(sourceFilePath);
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new FileNotFoundException(
                    `Can not find the specified file: "${sourceFilePath}"`, err);

            } else {
                throw new IOException(
                    `Can not read file: "${sourceFilePath}".`, err);
            }
        }
    }

    /**
     * 根据 attribute 的名称获取其值。
     *
     * 如果有多个同名 attribute，则返回第一个值。
     *
     * @param {*} attributeItems
     * @param {*} name
     * @returns attribute 的值。如果指定名称的 attribute 找不到，则返回 undefined。
     */
    static getAttributeByName(attributeItems, name) {
        let attributeList = FrontMatterResolver.getAttributeListByName(
            attributeItems, name);
        if (attributeList.length > 0) {
            return attributeList[0].value;
        }
    }

    /**
     * 根据 attribute 的名称获取值列表。
     *
     * 因为 attribute 的名称可以重复，所以这个方法
     * 返回的是一个 {lineIdx, value} 对象数组。
     *
     * @param {*} attributeItems
     * @param {*} name
     * @returns [{lineIdx, value}, ...]
     */
    static getAttributeListByName(attributeItems, name) {
        return attributeItems.filter(item => {
            return item.key === name;
        }).map(item => {
            return {
                lineIdx: item.lineIdx,
                value: item.value
            };
        });
    }

    /**
     * 获取 attribute 当中具有 locale title 格式的值。
     *
     * locale title 格式如：
     * - title: value2
     * - title[zh_CN]: value3
     * - title[locale_CODE]: valueN
     *
     * @param {*} attributeItems
     * @param {*} title
     * @returns
     */
    static getLocaleFormatAttributeMapByTitle(attributeItems, title) {
        let localeTitlePrefix = title + '[';

        // [{key:..., value:...},...]
        let localeItems = attributeItems.filter(item => {
            return item.key === title ||
                item.key.startsWith(localeTitlePrefix);
        }).map(item => {
            return {
                key: item.key,
                value: item.value
            };
        });

        // {
        //     title: value1,
        //     title[zh_CN]: value2,
        //     title[locale_CODE]: value3
        // }
        let localeItemMap = ObjectUtils.collapseKeyValueArray(localeItems, 'key', 'value');
        return localeItemMap;
    }

}

module.exports = FrontMatterResolver;