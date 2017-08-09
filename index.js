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
    console.info('正在获取有道单词本...');
    const params = Object.assign({}, RequestOptions.youdao, {
      duration: '0',
      imprTime: '0',
      isLabel: 'false',
      playCount: '0',
      time: '0',
    });
    const res = await request.post('http://yiduserver.youdao.com/userprofile.s?method=wordbook').type('form').send(params);
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
    console.info(`获取成功，共${Data.youdao.length}个单词`);
  }
  static async cleanYoudaoWord(word) {
    console.info('...正在清空有道单词本：', word);
    const params = Object.assign({}, RequestOptions.youdao, {method: 'delete', word});
    console.dir(params);
    await request.post('http://yiduserver.youdao.com/wb.s').type('form').send(params);
  }
  static async cleanYoudao() {
    console.info('正在清空有道单词本');
    const data = _.chunk(Data.youdao, 20 + _.random(0, 10));
    const clean = async () => {
      if (data.length > 0) {
        const allRequest = data.shift().map(word => Capture.cleanYoudaoWord(word));
        await Promise.all(allRequest);
        await clean();
      }
      else {
        console.info('有道生词本清空完毕')
      }
    };
    await clean();
  }
  static write() {
    const fs = require('fs');
    const path = require('path');
    const data = _.union(Data.youdao).join('\n');
    fs.writeFileSync(path.join(__dirname, 'words.txt'), data, {encoding: 'utf8'});
  }
  static async insertDict() {
    console.info('正在导入欧路...');
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
    if (Data.youdao.length > 0) {
      await Capture.write();
      await Capture.insertDict();
      Capture.cleanYoudao();
    }
    else {
      console.info('没有要导入的生词');
    }
  }
  catch(err) {
    console.info(err.message);
  }
}, 0);
