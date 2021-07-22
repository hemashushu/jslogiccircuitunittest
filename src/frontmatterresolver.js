const path = require('path');

const fsPromise = require('fs/promises');

const { Buffer } = require('buffer');

const { ParseException, IOException, FileNotFoundException } = require('jsexception');
const { PromiseFileConfig, YAMLFileConfig } = require('jsfileconfig');

const ScriptParseException = require('./scriptparseexception');
const ParseErrorDetail = require('./parseerrordetail');
const ParseErrorCode = require('./parseerrorcode');

/**
 * 解析诸如的头信息值：
 * object(file:file_name.yaml)
 * binary(file:file_name.bin)
 */
class FrontMatterResolver {
    static async resolve(frontMatter, scriptFilePath) {
        let resolvedFrontMatter = {};

        for(let key in frontMatter) {
            let value = frontMatter[key];
            if (typeof value === 'string') {
                let match = /^(object|binary)\s*\((.+)\)$/.exec(value);
                if (match === null) {
                    resolvedFrontMatter[key] = value;
                    continue;
                }

                let sourceType = match[1];
                let sourcePath = match[2].trim();

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
                let sourceValue = await FrontMatterResolver.loadSourceValue(
                    sourceType, sourceFileName, scriptFilePath);

                resolvedFrontMatter[key] = sourceValue;

            }else {
                resolvedFrontMatter[key] = value;
            }
        }

        return resolvedFrontMatter;
    }

    static async loadSourceValue(sourceType, sourceFileName, scriptFilePath) {
        let scriptFileDirectory = path.dirname(scriptFilePath);
        let sourceFilePath = path.join(scriptFileDirectory, sourceFileName);

        if (sourceType === 'object') {
            return await FrontMatterResolver.loadObjectValue(sourceFilePath);
        }else if(sourceType === 'binary') {
            return await FrontMatterResolver.loadBinaryValue(sourceFilePath);
        }
    }

    /**
     *
     * @param {*} sourceFilePath
     * @returns 一个数据对象或者数据数组，
     *     - 如果文件不存在或者文件内容为空，则返回 undefined.
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
     *
     * @param {*} sourceFilePath
     * @returns Nodejs 的 Buffer 对象
     *     - 如果文件不存在，则抛出 FileNotFoundException 异常。
     *     - 如果读取文件失败，则抛出 IOException 异常。
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