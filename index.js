const request = require('superagent');
const cheerio = require('cheerio');
const qs = require('querystring');
const _ = require('lodash');
const RequestOptions = require('./request.config');
const Data = {
  youdao: [],
};

class Capture {
  static async fetchYoudao() {
    const res = await request.post('http://yiduserver.youdao.com/userprofile.s?method=wordbook').type('form').send(RequestOptions.youdao);
    const body = res.body;
    if (Array.isArray(body.datas) && body.datas.length > 0) {
      body.datas.forEach((item) => {
        const word = item.word;
        if (!word) {
          return;
        }
        if (!/^[a-zA-Z\s]+$/.test(word)) {
          console.warn('The word has warning:', word);
          return;
        }
        Data.youdao.push(word);
      });
    }
    console.log('The youdao was fetched complete! it has got ' + Data.youdao.length + ' works');
  }
  static write() {
    const fs = require('fs');
    const path = require('path');
    const data = _.union(Data.youdao).join('\n');
    fs.writeFileSync(path.join(__dirname, 'words.txt'), data, {encoding: 'utf8'});
  }
  static async insertDict() {
    const path = require('path');
    await request.post('https://my.eudic.net/studylist/import')
      .set(RequestOptions.eudic)
      .type('form')
      .attach('file', path.join(__dirname, 'words.txt'), 'words.txt');
    console.info('导入成功');
  }
}

setTimeout(async () => {
  try {
    await Capture.fetchYoudao();
    await Capture.write();
    await Capture.insertDict();
  }
  catch(err) {
    console.info(err.message);
  }
}, 0);
