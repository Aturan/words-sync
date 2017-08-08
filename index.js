const request = require('superagent');
const cheerio = require('cheerio');
const qs = require('querystring');
const _ = require('lodash');
const RequestOptions = require('./request.config');
const Data = {
  eudic: [],
  youdao: [],
};

class Capture {
  static async fetchEudic() {
    const res = await request('https://my.eudic.net/studylist/print/0?order=word&ordertype=asc').set(RequestOptions.eudic);
    const $ = cheerio.load(res.text);
    const table = $('table tbody');
    table.find('tr').first().remove();
    table.find('tr').each((i, el) => {
      const word = $(el).find('td').eq(1).text().trim();
      if (!word) {
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(word)) {
        console.warn('The word has warning:', word);
        return;
      }
      Data.eudic.push(word);
    });
    console.log('The eudic was fetched complete! it has got ' + Data.eudic.length + ' works');
  }

  static async insertToShanbay(words) {
    if (!words || words.length === 0) {
      console.info('it doesn\'t has more word');
      return;
    }
    const chunks = _.chunk(words, 10);
    const insertActions = chunks.map(async item => {
      const words = item.map(data => data.replace(/\s+/g, '+')).join('\n');
      const params = qs.stringify({words, _: Date.now()});
      const res = await request(`https://www.shanbay.com/bdc/vocabulary/add/batch/?${params}`).set(RequestOptions.shanbay);
      if (!res.body || !res.body.hasOwnProperty('result')) {
        throw new Error('Insert Failed!');
      }
      if (Number(res.body.result) === 0) {
        console.log('Insert successful:', item.join(','));
      }
      else {
        console.info(item.join('\n'));
        throw new Error(`Insert Failed: ${params}`);
      }
    });
    await Promise.all(insertActions);
  }

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
    console.log('The eudic was fetched complete! it has got ' + Data.youdao.length + ' works');
  }
}

setTimeout(async () => {
  try {
    await Capture.fetchEudic();
    await Capture.fetchYoudao();
    await Capture.insertToShanbay(Data.eudic);
    await Capture.insertToShanbay(Data.youdao);
  }
  catch(err) {
    console.info(err.message);
  }
}, 0);
