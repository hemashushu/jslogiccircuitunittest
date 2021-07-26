const { ObjectUtils } = require('jsobjectutils');

const {
    ScriptParseException,
    ParseErrorCode,
    FrontMatterParser
} = require('../index');

const assert = require('assert/strict');

describe('FrontMatterParser test', () => {
    it('Test parsing key/value', () => {
        let fm1 = FrontMatterParser.parseLine(0, 'number: 123');
        assert(ObjectUtils.equals(fm1, { key: 'number', value: 123 }));

        let fm2 = FrontMatterParser.parseLine(0, 'boolean:True');
        assert(ObjectUtils.equals(fm2, { key: 'boolean', value: true }));

        let fm3 = FrontMatterParser.parseLine(0, 'string: foo');
        assert(ObjectUtils.equals(fm3, { key: 'string', value: 'foo' }));

        let fm4 = FrontMatterParser.parseLine(0, 'quote string: "Foo Bar"');
        assert(ObjectUtils.equals(fm4, { key: 'quote string', value: 'Foo Bar' }));

        let fm5 = FrontMatterParser.parseLine(0, 'long number: 123_456');
        assert(ObjectUtils.equals(fm5, { key: 'long number', value: 123456 }));

        let fm6 = FrontMatterParser.parseLine(0, 'binary: 0b11_00');
        assert(ObjectUtils.equals(fm6, { key: 'binary', value: 0b1100 }));

        let fm7 = FrontMatterParser.parseLine(0, 'hex: 0xff_00');
        assert(ObjectUtils.equals(fm7, { key: 'hex', value: 0xff00 }));

        let fm8 = FrontMatterParser.parseLine(0, 'number with comment: 456 # rem1');
        assert(ObjectUtils.equals(fm8, { key: 'number with comment', value: 456 }));

        let fm9 = FrontMatterParser.parseLine(0, 'boolean with comment: false # rem2');
        assert(ObjectUtils.equals(fm9, { key: 'boolean with comment', value: false }));

        let fm10 = FrontMatterParser.parseLine(0, 'string with comment: hello # rem3');
        assert(ObjectUtils.equals(fm10, { key: 'string with comment', value: 'hello' }));

        let fm11 = FrontMatterParser.parseLine(0, 'quote string with comment: "hello # world"  #rem4');
        assert(ObjectUtils.equals(fm11, { key: 'quote string with comment', value: 'hello # world' }));
    });

    it('Test syntax error', () => {
        try {
            FrontMatterParser.parseLine(0, 'string with no ending quote: "Hello! World');
            assert.fail();
        } catch (e) {
            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
            assert.equal(e.parseErrorDetail.messageId, 'no-ending-quote-in-front-matter-line');
            assert.equal(e.parseErrorDetail.lineIdx, 0);
        }

        try {
            FrontMatterParser.parseLine(0, 'no colon');
            assert.fail();
        } catch (e) {
            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
            assert.equal(e.parseErrorDetail.messageId, 'missing-colon-in-front-matter-line');
            assert.equal(e.parseErrorDetail.lineIdx, 0);
        }
    });
});
