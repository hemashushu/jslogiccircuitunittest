const { PromiseTextFile } = require('jstextfile');

const DataRowParser = require('./datarowparser');
const PortListParser = require('./portlistparser');
const FrontMatterParser = require('./frontmatterparser');

class TestScriptParser {
    constructor() {
        //
    }

    static async parseFile(filPath) {
        let {textContent} = await PromiseTextFile.read(filPath);
        return textContent;
    }

    static async parse(textContent) {
        let frontMatters = [];
        let ports;
        let dataRowStack = [];
        // dataStack = [group1, group2, ...]
        //
        // DataRow {
        //   type='group/data/nop',
        //   repeat=true/false,
        //   variableName = 'a',
        //   from=0,
        //   to=100,
        //   rows=[]
        // }

        let lines = textContent.split('\n').map(line => {return line.trim();});
        let state = 'expect-fm-or-pl'; // front-matter or port list
        for(let line of lines) {
            if (line === '' ||
                line.startsWith('#')) {
                continue;
            }

            switch(state) {
                case 'expect-fm-start-or-portlist':
                    {
                        if (line === '---'){
                            state = 'expect-fm-end';
                        }else {
                            ports = PortListParser.parse(line);
                        }
                        break;
                    }

                case 'expect-fm-end':
                    {
                        if (line === '---') {
                            state = 'expect-portlist';
                        }else {
                            let frontMatter = FrontMatterParser.parse(line);
                            frontMatters.push(frontMatter);
                        }
                        break;
                    }

                case 'expect-portlist':
                    {
                        ports = PortListParser.parse(line);
                        state = 'expect-data-row';
                        break;
                    }

                case 'expect-data-row':
                    {
                        if (/^nop\s*\(/.test(line)) {
                            // parse 'nop'
                        }else if (/^repeat\s*\(/.test(line)) {
                            // parse 'repeat'
                        }else if (/^for\s*\(/.test(line)) {
                            // parse 'for'
                        }else {
                            // parse normal data list
                        }
                    }
            }
        }
    }
}

module.exports = TestScriptParser;