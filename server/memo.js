"use strict";

const fs = require("fs");
const { getMemo_class, save_path } = require("./config");
const { logger, logDebug, log, logError } = require("./logger");

// const { getUserHash } = require("./tracks/index");
const { store_tm } = require("./review");

const memo_path = `${save_path}/memo`;
const memo_class = getMemo_class();
const memo_save_file = `${memo_path}/memos_data.json`


// 地点メモ保存データ
let memos = {
  classify: memo_class,
  data: []
};

// 地点メモ保存データ初期化
const get_memos_from_file = () => {
  try {
    const txt = fs.readFileSync(memo_save_file);
    memos.data = JSON.parse(txt);
  } catch(err) {
    console.log(err);
    console.log("地点メモ保存データファイルが無かったので作成しました。");
    memos.data = []
    fs.writeFileSync(memo_save_file, JSON.stringify(memos.data));
  }
}

// 地点メモ保存
const save_memo_to_file = () => {
  fs.writeFile(memo_save_file, JSON.stringify(memos.data), err => {
    if (err) {
      console.log(err);
      console.log("メモデータ保存に失敗しました。")
    } else {
      console.log("メモデータ保存を行いました")
    }
  })
}


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

// memoフォルダ作成
// recursive: trueを設定しておけばディレクトリが存在していてもエラーにならない
fs.mkdirSync(memo_path, { recursive: true });

const memo_init = async () => {
  try {
    // memos.data = [];
    get_memos_from_file();
  } catch (e) {
    log("メモレイヤーデータ読み込み失敗、初期値を展開します");
    memos = { classify: memo_class, data: [] };
  }
}
memo_init();

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
        io.emit("memo", memos.data);
        store_tm("memo", memos.data)
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
    // テキストファイルを生成する(idがファイル名、infoがテキストデータ)
    let prefix = "";
    if ("video" == memo.kind) {
      prefix = "_video";
    } else if ("photo" == memo.kind) {
      prefix = "_photo";
    }
    const file_name = memo_path + "/" + memo.id + prefix + ".txt";
    fs.writeFileSync(file_name, memo.info);
    // メモデータを再構築
    memos.data.push(memo);
    io.emit("memo", memos.data);
    store_tm("memo", memos.data)
    save_memo_to_file();
  } catch (error) {
    logError("Memo create NG:");
    logError(memo);
    logError(error);
  }
};

exports.delMemo = function(io, id) {
  log("DELETE MEMO: " + id);
  memos.data = memos.data.filter(m => m.id !== id);
  io.emit("memo", memos.data);
  store_tm("memo", memos.data)
  save_memo_to_file();
};
exports.memo_path = memo_path;
