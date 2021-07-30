const ParseErrorCode = {
    syntaxError: 'syntaxError',

    moduleNotFound: 'moduleNotFound',
    portNotFound: 'portNotFound',

    // 脚本当中的 "key: object(file:file_name.yaml)" 多指定的
    // 文件内容是空的，或者没有实质数据（比如只有注释），调用者无法
    // 判断值是一个对象还是对象数组。
    emptyObjectSourceFile: 'emptyObjectSourceFile',

    // 端口名称约束错误（端口名称不符合要求）
    invalidPortName: 'invalidPortName',

    // 数据单元格数量跟端口数量不匹配
    mismatchDataCellCount: 'mismatchDataCellCount',

    // 算术表达式运算失败
    evaluateError: 'evaluateError'
};

module.exports = ParseErrorCode;