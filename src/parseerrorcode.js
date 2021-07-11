const ParseErrorCode = {
    syntaxError: 'syntaxError',

    moduleNotFound: 'moduleNotFound',
    portNotFound: 'portNotFound',

    // 端口名称约束错误（端口名称不符合要求）
    invalidPortName: 'invalidPortName',

    // 算术表达式运算失败
    evaluateError: 'evaluateError'
};

module.exports = ParseErrorCode;