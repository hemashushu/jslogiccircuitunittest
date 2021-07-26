const { ObjectUtils } = require('jsobjectutils');
const { BitRange } = require('jslogiccircuit');

const {
    ScriptParseException,
    ParseErrorCode,
    PortListParser,
    PortItem,
    SlicePortItem,
    CombinedPortItem
} = require('../index');

const assert = require('assert/strict');

describe('PortListParser test', () => {
    it('Test parsing port names', () => {
        // 多个端口
        let portItems1 = PortListParser.parse(0, 'A B Q');
        assert.equal(portItems1.length, 3);
        assert(ObjectUtils.objectEquals(portItems1[0], new PortItem('A')))
        assert(ObjectUtils.objectEquals(portItems1[1], new PortItem('B')))
        assert(ObjectUtils.objectEquals(portItems1[2], new PortItem('Q')))

        // 端口切片
        let portItems2 = PortListParser.parse(0, 'A[12]');
        assert.equal(portItems2.length, 1);
        assert(portItems2[0] instanceof SlicePortItem);
        assert(ObjectUtils.objectEquals(portItems2[0], new SlicePortItem('A', [new BitRange(12, 12)])));

        // 端口切片-范围
        let portItems3 = PortListParser.parse(0, 'A[7:0]');
        assert.equal(portItems3.length, 1);
        assert(ObjectUtils.objectEquals(portItems3[0], new SlicePortItem('A', [new BitRange(7, 0)])));


        // 端口切片-多段
        let portItems4 = PortListParser.parse(0, 'A[14, 12:10, 9, 7:0]');
        assert.equal(portItems4.length, 1);
        assert(ObjectUtils.objectEquals(portItems4[0],
            new SlicePortItem('A', [
                new BitRange(14, 14),
                new BitRange(12, 10),
                new BitRange(9, 9),
                new BitRange(7, 0)
            ])));

        // 端口拼接
        let portItems5 = PortListParser.parse(0, '{A3,A2,A1,A0}');
        assert.equal(portItems5.length, 1);
        assert(portItems5[0] instanceof CombinedPortItem);
        assert(ObjectUtils.arrayEquals(portItems5[0].childPortItems,
            [
                new PortItem('A3'),
                new PortItem('A2'),
                new PortItem('A1'),
                new PortItem('A0')
            ]));

        // 拼接内含切片
        let portItems6 = PortListParser.parse(0, '{A[7:0],B[12, 4:0],C}');
        assert(ObjectUtils.arrayEquals(portItems6[0].childPortItems,
            [
                new SlicePortItem('A', [new BitRange(7, 0)]),
                new SlicePortItem('B', [new BitRange(12, 12), new BitRange(4, 0)]),
                new PortItem('C')
            ]));

        // 单端口、切片、拼接
        let portItems7 = PortListParser.parse(0, 'A B[4:0] {Cout, S}');
        assert.equal(portItems7.length, 3);
        assert(ObjectUtils.arrayEquals(portItems7,
            [
                new PortItem('A'),
                new SlicePortItem('B', [new BitRange(4, 0)]),
                new CombinedPortItem([
                    new PortItem('Cout'),
                    new PortItem('S')
                ])
            ]));
    });

    it('Test parsing name path', () => {
        let portItems10 = PortListParser.parse(0, 'A.B.C');
        assert.equal(portItems10.length, 1);
        assert(ObjectUtils.objectEquals(portItems10[0], new PortItem('A.B.C')));

        let portItems11 = PortListParser.parse(0, 'A.B.C[4:0]');
        assert.equal(portItems11.length, 1);
        assert(ObjectUtils.objectEquals(portItems11[0], new SlicePortItem('A.B.C', [new BitRange(4, 0)])));

        let portItems12 = PortListParser.parse(0, '{A.B.C, X.Y.Z}');
        assert.equal(portItems12.length, 1);
        assert(ObjectUtils.objectEquals(portItems12[0], new CombinedPortItem([
            new PortItem('A.B.C'),
            new PortItem('X.Y.Z')
        ])));

        let portItems13 = PortListParser.parse(0, '{A.B.C, D, X.Y.Z[7:0]}');
        assert.equal(portItems13.length, 1);
        assert(ObjectUtils.objectEquals(portItems13[0], new CombinedPortItem([
            new PortItem('A.B.C'),
            new PortItem('D'),
            new SlicePortItem('X.Y.Z', [new BitRange(7, 0)])
        ])));

        // 带注释
        let portItems20 = PortListParser.parse(0, 'A #rem2');
        assert(ObjectUtils.equals(portItems20[0], new PortItem('A')));

        let portItems21 = PortListParser.parse(0, 'A B#rem2');
        assert(ObjectUtils.equals(portItems21, [
            new PortItem('A'),
            new PortItem('B')
        ]));

        let portItems22 = PortListParser.parse(0, 'A {B,Q}#rem2');
        assert(ObjectUtils.equals(portItems22, [
            new PortItem('A'),
            new CombinedPortItem([
                new PortItem('B'),
                new PortItem('Q')
            ])
        ]));

        let portItems23 = PortListParser.parse(0, 'A {Cout, S} B[4:0]# rem1');
        assert(ObjectUtils.equals(portItems23, [
            new PortItem('A'),
            new CombinedPortItem([
                new PortItem('Cout'),
                new PortItem('S')
            ]),
            new SlicePortItem('B', [new BitRange(4, 0)])
        ]));
    });

    it('Test syntax error', () => {
        try {
            PortListParser.parse(0, 'A.');
            assert.fail();
        } catch (e) {
            assert(e instanceof ScriptParseException);
            assert.equal(e.parseErrorDetail.code, ParseErrorCode.syntaxError);
            assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
        }

        try {
            PortListParser.parse(0, 'Q A~B');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'invalid-port-name');
            assert.equal(e.parseErrorDetail.data.text, 'A~B');
        }

        try {
            PortListParser.parse(0, 'A[4:0]B');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
            assert.equal(e.parseErrorDetail.columnIdx, 6);
        }

        try {
            PortListParser.parse(0, '{A}B');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
            assert.equal(e.parseErrorDetail.columnIdx, 3);
        }

        try {
            PortListParser.parse(0, '"A"B');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'expect-space-between-port-names');
            assert.equal(e.parseErrorDetail.columnIdx, 3);
        }

        try {
            PortListParser.parse(0, 'A[2');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
        }

        try {
            PortListParser.parse(0, '{A');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'port-name-list-syntax-error');
        }

        try {
            PortListParser.parse(0, '{B A.}');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'combined-port-name-syntax-error');
        }

        try {
            PortListParser.parse(0, '{B A}[7:0]');
            assert.fail();
        } catch (e) {
            assert.equal(e.parseErrorDetail.messageId, 'expect-space-or-new-port-name');
            assert.equal(e.parseErrorDetail.columnIdx, 5);
        }


    });
});