const path = require('path');

const fsPromise = require('fs/promises');

const { IOException, FileNotFoundException } = require('jsexception');
const { PromiseFileConfig, YAMLFileConfig } = require('jsfileconfig');

const ScriptParseException = require('./scriptparseexception');
const ParseErrorDetail = require('./parseerrordetail');
const ParseErrorCode = require('./parseerrorcode');

/**
 * 提取头信息（Front-Matter）的 "属性" 和 "配置参数"
 */
class FrontMatterResolver {

    /**
     *
     * - 将头信息解析为 "属性" 和 "配置参数" 两个对象
     * - 解析配置参数里的外部值：
     *   - object(file:file_name.yaml)
     *   - binary(file:file_name.bin)
     *
     * 异常：
     * - 如果 YAML 对象文件解析失败，会抛出 ParseException。
     * - 如果文件内容为空或者无实际数据，会抛出 ScriptParseException。
     * - 如果文件不存在，则抛出 FileNotFoundException 异常。
     * - 如果读取文件失败，则抛出 IOException 异常。
     *
     * @param {*} frontMatter
     * @param {*} externalFileDirectory
     * @returns {attributes, configParameters}
     */
    static async resolve(frontMatter, externalFileDirectory) {
        let attributes = {};
        let configParameters = {};

        for(let key in frontMatter) {
            let value = frontMatter[key];

            // 以感叹号开始的键值对是属性
            if (key.startsWith('!')) {
                let keyName = key.substring(1);
                attributes[keyName] = value;
            }else {
                configParameters[key] = value;

            }
        }

        let resolvedConfigParameters = await FrontMatterResolver.resolveConfigParameters(
            configParameters, externalFileDirectory);

        return {
            attributes: attributes,
            configParameters: resolvedConfigParameters
        };
    }

    static async resolveConfigParameters(configParameters, externalFileDirectory) {
        let resolvedConfigParameters = {};

        for(let key in configParameters) {
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
                resolvedConfigParameters[key] = await FrontMatterResolver.resolveExternalValue(
                    sourceType, sourcePath, externalFileDirectory);

            }else {
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
     * @param {*} externalFileDirectory
     * @returns
     */
    static async resolveExternalValue(sourceType, sourcePath, externalFileDirectory) {
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
        let sourceFilePath = path.join(externalFileDirectory, sourceFileName);

        let sourceValue = await FrontMatterResolver.loadSourceValue(
            sourceType, sourceFilePath);

        return sourceValue;
    }

    static async loadSourceValue(sourceType, sourceFilePath) {
        if (sourceType === 'object') {
            return await FrontMatterResolver.loadObjectValue(sourceFilePath);
        }else if(sourceType === 'binary') {
            return await FrontMatterResolver.loadBinaryValue(sourceFilePath);
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
    static async loadObjectValue(sourceFilePath) {
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
    static async loadBinaryValue(sourceFilePath) {
        // https://nodejs.org/api/fs.html#fs_fspromises_readfile_path_options
        try {
            return await fsPromise.readFile(sourceFilePath);
        } catch (err) {
            if (err.code === 'ENOENT') {
                throw new FileNotFoundException(
                    `Can not find the specified file: "${sourceFilePath}"`, err);

            }else {
                throw new IOException(
                    `Can not read file: "${sourceFilePath}".`, err);
            }
        }
    }
}

module.exports = FrontMatterResolver;