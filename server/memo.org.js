"use strict";

const fs = require("fs");

const db = require("./models");
const Memo = db.Memo;
const moment = require("moment");
const { Op } = require("sequelize");
const { getMemo_class, save_path } = require("./config");
const memo_path = `${save_path}/memo`;
// const logger = require("./logger");
const { logger, logDebug, log, logError } = require("./logger");

// const { getUserHash } = require("./tracks/index");
const { store_tm } = require("./review");

const memo_class = getMemo_class();


// 地点メモ保存データ
let memos = {
  classify: memo_class,
  data: []
};

// --------------------------------------------------------------------------------
// API
// --------------------------------------------------------------------------------

// 分類名を取得する
exports.getClassify = async function(req, res) {
  try {
    // const memos = memo_class;
    const memos_class = getMemo_class();
    console.log(memos_class)
    res.send(memos_class);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

// ログインしたユーザの設定データを取得する
// 管理画面で使用する。
exports.getMemos = async function(req, res) {
  try {
    var user_id = req.body.userId;
    // ORMが受け付けられる形式に変換
    var begin = moment(req.body.begin).format();
    var end = moment(req.body.end).format();
    var text = req.body.text;

    let Memos = await Memo.findAll({
      where: {
        user_id: {
          [Op.or]: user_id
        },
        date: {
          [Op.gte]: begin,
          [Op.lt]: end
        },
        info: {
          [Op.like]: "%" + text + "%"
        }
      }
    });

    let res_data = [];

    Memos.forEach((data, i) => {
      let res_data_tmp = {};

      res_data_tmp.id = data.id;
      res_data_tmp.gid = data.gid;
      res_data_tmp.user_id = data.user_id;
      res_data_tmp.name = data.name;
      res_data_tmp.lng = data.lng;
      res_data_tmp.lat = data.lat;
      res_data_tmp.classify = data.classify;
      res_data_tmp.kind = data.kind;
      res_data_tmp.status = data.status;
      res_data_tmp.info = data.info;
      res_data_tmp.date = moment(data.date)
        .tz("Asia/Tokyo")
        .format("YYYY/MM/DD HH:mm:ss");
      res_data_tmp.display_flag = data.display_flag;

      res_data.push(res_data_tmp);
    });

    res.send(res_data);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};


// memoフォルダ作成
// recursive: trueを設定しておけばディレクトリが存在していてもエラーにならない
fs.mkdirSync(memo_path, { recursive: true });

const memo_init = async () => {
  try {
    memos.data = [];
    let memos_db = await Memo.findAll({
      where: {
        display_flag: 1
      }
    });
    for (var i = 0; i < memos_db.length; i++) {
      var val = {
        id: memos_db[i].dataValues.id,
        gid: memos_db[i].dataValues.gid,
        user_id: memos_db[i].dataValues.user_id,
        name: memos_db[i].dataValues.name,
        lng: memos_db[i].dataValues.lng,
        lat: memos_db[i].dataValues.lat,
        classify: memos_db[i].dataValues.classify,
        kind: memos_db[i].dataValues.kind,
        status: memos_db[i].dataValues.status,
        info: memos_db[i].dataValues.info,
        date: moment(memos_db[i].dataValues.date)
          .tz("Asia/Tokyo")
          .format("YYYY/MM/DD HH:mm:ss"),
        display_flag: memos_db[i].dataValues.display_flag
      };
      memos.data.push(val);
    }
  } catch (e) {
    log("メモレイヤーデータ読み込み失敗、初期値を展開します");
    memos = { classify: memo_class, data: [] };
    // fs.writeFileSync(memoFilePathName, JSON.stringify(memos), "utf-8");
  }
}
memo_init();

// exports.sendMemo = function(io) {
//   //const roomArray = _.map(userHash, user => user.group_id);
//   const groupArray = [];
//   const userHash = getUserHash();

//   for (const userId of Object.keys(userHash)) {
//     if (userHash[userId].page == "map") {
//       groupArray.push(userHash[userId].group_id);
//     }
//   }
//   const groupSet = new Set(groupArray);
//   for (const groupId of groupSet) {
//     const msg = JSON.stringify(memos.data.filter(m => m.gid == groupId));
//   }
//   // JSON文字列から生オブジェクトに変更
//   // io.sockets.emit("memo", JSON.stringify(memos.data));
//   io.sockets.emit("memo", memos.data);
//   store_tm("memo", memos.data)
// }

exports.sendMemo = function(socket) {
  socket.emit("memo", memos.data);
}


exports.upMemo = async function(io, msg) {
  log("UP MEMO: " + msg);
  console.log(`UP MEMO: ${msg}`);
  // JSON文字列から生オブジェクトに変更
  // const memo = JSON.parse(msg);
  const memo = msg;
  // 更新の場合、元々あったIDの情報を削除してから、追加
  if (memos.data.find(m => m.id == memo.id)) {
    let change_data;
    change_data = memos.data.filter(m => m.id == memo.id);
    memos.data = memos.data.filter(m => m.id != memo.id);

    if (change_data) {
      try {
        await Memo.update(memo, { where: { id: memo.id } });
        // テキストファイルに上書きする(なければ新規に作る)
        let prefix = "";
        if ("video" == memo.kind) {
          prefix = "_video";
        } else if ("photo" == memo.kind) {
          prefix = "_photo";
        }
        const file_name = memo_path + "/" + memo.id + prefix + ".txt";
        fs.writeFileSync(file_name, memo.info);
        log(`Memo update OK (id: ${memo.id})`);
        // メモデータを再構築
        memos.data.push(memo);
        // 更新メモデータを各端末へ配信
        // JSON文字列から生オブジェクトに変更2022/07/25中村
        // io.sockets.emit("memo", JSON.stringify(memos.data));
        io.sockets.emit("memo", memos.data);
        store_tm("memo", memos.data)
        // タイマリセット
        // const { resetMemoTimer } = require("./websock");
        // resetMemoTimer();
      } catch (error) {
        logError("Memo update NG:");
        logError(memo);
        logError(error);
      }
      return;
    }
  }
  // もし、分類名が新しいものだったら、追加する。
  if (memo.classify != "" && !memos.classify.includes(memo.classify)) {
    memos.classify.push(memo.classify);
  }

  // メモ作成時にDBへ登録する
  try {
    const created = await Memo.create(memo);
    // テキストファイルを生成する(idがファイル名、infoがテキストデータ)
    let prefix = "";
    if ("video" == memo.kind) {
      prefix = "_video";
    } else if ("photo" == memo.kind) {
      prefix = "_photo";
    }
    const file_name = memo_path + "/" + memo.id + prefix + ".txt";
    fs.writeFileSync(file_name, memo.info);
    log(`Memo create OK (user_id: ${created.user_id}, id: ${created.id})`);
    // メモデータを再構築
    memos.data.push(memo);
    // JSON文字列から生オブジェクトに変更2022/07/25中村
    // io.sockets.emit("memo", JSON.stringify(memos.data));
    io.sockets.emit("memo", memos.data);
    store_tm("memo", memos.data)
    // タイマリセット
    // const { resetMemoTimer } = require("./websock");
    // resetMemoTimer();
  } catch (error) {
    if (error instanceof db.Sequelize.UniqueConstraintError) {
      log("Memo create SKIP(duplicated)");
    } else {
      logError("Memo create NG:");
      logError(memo);
      logError(error);
    }
  }
};

exports.delMemo = function(io, id) {
  log("DELETE MEMO: " + id);
  const mem = memos.data.find(m => m.id == id);
  if (mem == null) {
    logError(`メモレイヤーデータ削除エラー: 指定id(${id})のデータなし。`);
    return;
  }

  Memo.update(
    {
      display_flag: 0
    },
    {
      where: {
        id: id
      }
    }
  ).catch(function(err) {
    console.log("Memo_update_errlog:" + err);
  });
  // メモデータを再構築
  Memo.findAll({
    where: {
      display_flag: 1
    }
  }).then(function(memos_db) {
    memos.data = [];
    for (var i = 0; i < memos_db.length; i++) {
      var val = {
        id: memos_db[i].dataValues.id,
        gid: memos_db[i].dataValues.gid,
        user_id: memos_db[i].dataValues.user_id,
        name: memos_db[i].dataValues.name,
        lng: memos_db[i].dataValues.lng,
        lat: memos_db[i].dataValues.lat,
        classify: memos_db[i].dataValues.classify,
        kind: memos_db[i].dataValues.kind,
        status: memos_db[i].dataValues.status,
        info: memos_db[i].dataValues.info,
        date: moment(memos_db[i].dataValues.date)
          .tz("Asia/Tokyo")
          .format("YYYY/MM/DD HH:mm:ss"),
        display_flag: memos_db[i].dataValues.display_flag
      };
      memos.data.push(val);
    }
    // 更新メモデータを各端末へ配信
    // JSON文字列から生オブジェクトに変更2022/07/25中村
    // io.sockets.emit("memo", JSON.stringify(memos.data));
    io.sockets.emit("memo", memos.data);
    store_tm("memo", memos.data)
    // タイマリセット
    // const { resetMemoTimer } = require("./websock");
    // resetMemoTimer();
  });
};

// RAM上のメモデータ更新 => 次周期で各端末に更新を通知
exports.db_update = async function() {
  try {
    const memos_db = await Memo.findAll({
      where: {
        display_flag: 1
      }
    });
    memos.data = [];
    for (var i = 0; i < memos_db.length; i++) {
      var val = {
        id: memos_db[i].dataValues.id,
        gid: memos_db[i].dataValues.gid,
        user_id: memos_db[i].dataValues.user_id,
        name: memos_db[i].dataValues.name,
        lng: memos_db[i].dataValues.lng,
        lat: memos_db[i].dataValues.lat,
        classify: memos_db[i].dataValues.classify,
        kind: memos_db[i].dataValues.kind,
        status: memos_db[i].dataValues.status,
        info: memos_db[i].dataValues.info,
        date: moment(memos_db[i].dataValues.date)
          .tz("Asia/Tokyo")
          .format("YYYY/MM/DD HH:mm:ss"),
        display_flag: memos_db[i].dataValues.display_flag
      };
      memos.data.push(val);
    }
  } catch (error) {
    logError(error);
  }
};

exports.memo_path = memo_path;
