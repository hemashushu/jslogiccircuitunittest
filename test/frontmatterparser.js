const { ObjectUtils } = require('jsobjectutils');

const {
    ScriptParseException,
    ParseErrorCode,
    FrontMatterItem,
    FrontMatterParser
} = require('../index');

const assert = require('assert/strict');

describe('FrontMatterParser test', () => {
    it('Test parsing key/value', () => {
        let fm1 = FrontMatterParser.parseLine(0, 'number: 123');
        assert(ObjectUtils.equals(fm1, new FrontMatterItem(0, 'number', 123)));

        let fm2 = FrontMatterParser.parseLine(1, 'boolean:True');
        assert(ObjectUtils.equals(fm2, new FrontMatterItem(1, 'boolean', true)));

        let fm3 = FrontMatterParser.parseLine(2, 'string: foo');
        assert(ObjectUtils.equals(fm3, new FrontMatterItem(2, 'string', 'foo')));

        let fm4 = FrontMatterParser.parseLine(0, 'quote string: "Foo Bar"');
        assert(ObjectUtils.equals(fm4, new FrontMatterItem(0, 'quote string', 'Foo Bar')));

        let fm5 = FrontMatterParser.parseLine(0, 'long number: 123_456');
        assert(ObjectUtils.equals(fm5, new FrontMatterItem(0, 'long number', 123456)));

        let fm6 = FrontMatterParser.parseLine(0, 'binary: 0b11_00');
        assert(ObjectUtils.equals(fm6, new FrontMatterItem(0, 'binary', 0b1100)));

        let fm7 = FrontMatterParser.parseLine(0, 'hex: 0xff_00');
        assert(ObjectUtils.equals(fm7, new FrontMatterItem(0, 'hex', 0xff00)));

        let fm8 = FrontMatterParser.parseLine(0, 'number with comment: 456 # rem1');
        assert(ObjectUtils.equals(fm8, new FrontMatterItem(0, 'number with comment', 456)));

        let fm9 = FrontMatterParser.parseLine(0, 'boolean with comment: false # rem2');
        assert(ObjectUtils.equals(fm9, new FrontMatterItem(0, 'boolean with comment', false)));

        let fm10 = FrontMatterParser.parseLine(0, 'string with comment: hello # rem3');
        assert(ObjectUtils.equals(fm10, new FrontMatterItem(0, 'string with comment', 'hello')));

        let fm11 = FrontMatterParser.parseLine(0, 'quote string with comment: "hello # world"  #rem4');
        assert(ObjectUtils.equals(fm11, new FrontMatterItem(0, 'quote string with comment', 'hello # world')));

        let fm12 = FrontMatterParser.parseLine(0, '!clock: clk');
        assert(ObjectUtils.equals(fm12, new FrontMatterItem(0, '!clock', 'clk')));

        let fm13 = FrontMatterParser.parseLine(0, '!set: A= 0b1000');
        assert(ObjectUtils.equals(fm13, new FrontMatterItem(0, '!set', 'A= 0b1000')));

        let fm14 = FrontMatterParser.parseLine(0, '!set: {A[1], B[2:0]} = 0b1zz0');
        assert(ObjectUtils.equals(fm14, new FrontMatterItem(0, '!set', '{A[1], B[2:0]} = 0b1zz0')));
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
