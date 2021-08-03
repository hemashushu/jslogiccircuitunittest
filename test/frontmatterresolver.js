const path = require('path');

const { ObjectUtils } = require('jsobjectutils');

const { ParseException, FileNotFoundException } = require('jsexception');

const {
    ScriptParseException,
    FrontMatterResolver
} = require('../index');

const assert = require('assert/strict');

describe('FrontMatterResolver test', () => {
    it('Test resolving attributes and configuration parameters', async () => {
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');

        let frontMatter1 = {
            '!clock': 'D',
            '!edge': 'posedge',
            '!title': 'This is title',
            bitWidth: 8,
            inputPinCount: 4
        };

        let { attributes, configParameters } = await FrontMatterResolver.resolve(
            frontMatter1, resourcesDirectory);

        assert(ObjectUtils.objectEquals(attributes, {
            clock: 'D',
            edge: 'posedge',
            title: 'This is title'
        }));

        assert(ObjectUtils.objectEquals(configParameters, {
            bitWidth: 8,
            inputPinCount: 4
        }));
    });

    it('Test "object" value type', async () => {
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');

        let frontMatter1 = {
            key1: 'object(file:sample.yaml)'
        };

        let { configParameters } = await FrontMatterResolver.resolve(
            frontMatter1, resourcesDirectory);

        assert(ObjectUtils.objectEquals(configParameters, {
            key1: [
                { address: 0, value: 0 },
                { address: 1, value: 0 },
                { address: 2, value: 0 },
                { address: 3, value: 1 }
            ]
        }));

        // 测试 object 文件内容为空的情况
        let frontMatter2 = {
            key1: 'object(file:empty.yaml)'
        };

        try {
            await FrontMatterResolver.resolve(
                frontMatter2, resourcesDirectory);
            assert.fail();
        } catch (err) {
            assert(err instanceof ScriptParseException);
        }

        // 测试 object 文件语法错误的情况
        let frontMatter3 = {
            key1: 'object(file:error.yaml)'
        };

        try {
            await FrontMatterResolver.resolve(
                frontMatter3, resourcesDirectory);
            assert.fail();
        } catch (err) {
            assert(err instanceof ParseException);
        }

        // 测试 object 文件不存在的情况
        let frontMatter4 = {
            key1: 'object(file:no-this-file.yaml)'
        };

        try {
            await FrontMatterResolver.resolve(
                frontMatter4, resourcesDirectory);
            assert.fail();
        } catch (err) {
            assert(err instanceof FileNotFoundException);
        }
    });

    it('Test "binary" value type', async () => {
        let testDirectory = __dirname;
        let resourcesDirectory = path.join(testDirectory, 'resources');

        let frontMatter1 = {
            key1: 'binary(file:sample.bin)'
        };

        let { configParameters } = await FrontMatterResolver.resolve(
            frontMatter1, resourcesDirectory);

        let buffer1 = configParameters.key1;
        assert.equal(5, buffer1.length);
        assert.equal('hello', buffer1.toString('utf-8'));

        // 测试 binary 文件不存在的情况
        let frontMatter2 = {
            key1: 'binary(file:no-this-file.bin)'
        };

        try {
            await FrontMatterResolver.resolve(
                frontMatter2, resourcesDirectory);
            assert.fail();
        } catch (err) {
            assert(err instanceof FileNotFoundException);
        }
    });
});
