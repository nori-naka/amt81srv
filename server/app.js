"use strict";

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const app = express();

const auth = require("./auth");
const config = require("./config");
const track = require("./tracks");
// const jwt = require("./jwt");
const memo = require("./memo");
// const admin = require("./admin");
const review = require("./review");
const chat = require("./chat");
// const { recog } = require("./recog");
// const { io } = require("./websock");
// const websocket = require("./websock");

const callrec_path = `${config.save_path}/callrec/`;
const memo_path = memo.memo_path;
console.log(`MEMO_PATH=${memo_path}`);

// const { Worker } = require("worker_threads");
// const worker = new Worker("./recog.js");
// worker.on("message", msg => {
//   const { io } = require("./websock");
//   io.emit("chat_msg", msg);
// });

// 映像ファイルの正規パターン
const REG_VIDOE_FILE = /^(.+)_(\d{13})\.webm$/

const origin_list = require("../user_config/server.json").origin || [""] ;

// ミドルウェア設定
app.use(
  express.json(),
  express.urlencoded({
    extended: false
  })
);
// app.use(auth.middlewares);
// CORS
// -----------------------------------------------------------------
const allowCrossDomain = function(req, res, next) {
  if (origin_list.includes(req.headers.origin)) {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header('Access-Control-Allow-Private-Network', true);
  res.header('Access-Control-Allow-Credentials', true);
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, access_token'
  );
  // res.cookie('msg', msg, {
  //   httpOnly: true,
  //   sameSite: "none"
  // });
  // intercept OPTIONS method
  if ('OPTIONS' === req.method) {
    res.send(200)
  } else {
    next()
  }
}
app.use(allowCrossDomain);
// -----------------------------------------------------------------
// ログイン画面は認証なしでアクセス可能
// app.use(express.static("public_html"));

// 認証機能を有効化
// ログイン前にアクセス必要なリソースは有効化前に定義すること
// app.use(auth.api);

// まず保存フォルダがあるか？無ければ作る。
if (!fs.existsSync(memo_path)) {
  fs.mkdir(memo_path, err => {
    if (err) {
      console.log(`ERROR MKDIR : ${memo_path} Folder`);
    } else {
      console.log(`MKDIR ${memo_path} Folder SUCCEES`);
    }
  });
} else {
  console.log(`EXISTS ${memo_path} Folder`);
}

// メモに添付されたファイルのアップロード受け口
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, memo_path);
  },
  filename: function(req, file, cb) {
    cb(null, decodeURIComponent(file.originalname));
  }
});
const upload = multer({ storage: storage });
app.post("/api/upload", upload.single("data"), function(req, res, next) {
  console.log(req.file);
  console.log("FILE UPLOAD Complete");
  res.send("FILE UPLOAD Complete");
});

// 通話記録
const file_list = [];
let all_file_size = 0;
const LIMIT_ALL_FILE_SIZE = 128 * 1024 * 1024; // 保存領域上限128MB
// const LIMIT_ALL_FILE_SIZE = 128 * 1024; // 保存領域上限128kB

// callrec保存フォルダ作成
fs.mkdirSync(callrec_path, { recursive: true });

const init_file_list = dirpath => {
  fs.readdir(dirpath, { withFileTypes: true }, (err, dirents) => {
    if (err) {
      console.error(err);
      return;
    }
    for (const dirent of dirents) {
      // const fp = path.join(dirpath, dirent.name);
      if (!dirent.isDirectory()) {
        add_file_list(dirent.name, null);
      }
    }
  });
};
init_file_list(callrec_path);

const storage_callrec = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, callrec_path);
  },
  filename: function(req, file, cb) {
    cb(null, decodeURIComponent(file.originalname));
  }
});
const upload_callrec = multer({ storage: storage_callrec });
const clearId = {};
app.post("/api/callrec",
  upload_callrec.single("data"),
  function (req, res, next) {
    console.log(req.file);
    console.log(`id = ${req.body.id} group_id = ${req.body.group_id}`);
    // const { id, group_id, user_name } = JSON.parse(req.body.info);
    const fp = path.join(callrec_path, req.file.filename);

    console.log(`CALLREC: FILE UPLOAD Complete ${fp}`);
    add_file_list(req.file.filename, () => {
      // worker.postMessage(fp);
      // const { io } = require("./websock")
      // recog(fp, (recong_txt) => {
      //   io.emit("chat_msg", {
      //     id: id,
      //     name: user_name,
      //     group_id: group_id,
      //     time: Date.now(),
      //     msg: recong_txt,
      //     nack: false,
      //     href: `/callrec/${req.file.filename}`
      //   });
      // });
      del_files();
    });

    res.send("CALLREC: FILE UPLOAD Complete");
  }
);
app.post("/api/on_video", (req, res) => {
  console.log(req.body);
  const { id, on_video } = req.body;
  track.set_on_video(id, on_video);

  if (clearId[id]) {
    clearInterval(clearId[id]);
  }
  // 2分間まって、次のアップロードが無い場合には、映像ファイル指定をNULLにする
  clearId[id] = setTimeout(() => {
    track.set_on_video(id, false);
  }, 2 * 60 * 1000)
  res.send(200);
})

const del_files = () => {
  if (all_file_size < LIMIT_ALL_FILE_SIZE) {
    return;
  } else {
    const del_file_stat = file_list.shift();
    fs.unlink(del_file_stat.path, err => {
      console.log(err);
      console.log(`DELETE FILE: ${del_file_stat.path}`);
    });
    all_file_size -= del_file_stat.size;
    del_files();
  }
};

const add_file_list = (file_name, callback) => {
  const fp = path.join(callrec_path, file_name);
  fs.stat(fp, (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(fp); // ファイルパス
    console.log(stats.size); // ファイルサイズ
    console.log(stats.ctime); // 作成時刻
    file_list.push({ time: stats.ctime, path: fp, size: stats.size });
    all_file_size += stats.size;

    if (callback) callback();
  });
};

// API
app.post("/api/config", config.getConfig);
// -- heroku化のため、コメントアウトする --
// app.post("/api/tracks", track.getTracks);
app.get("/api/classify", memo.getClassify);

// 認証
app.get("/api/req_login", auth.req_login);
app.post("/api/req_auth", auth.req_auth);
app.post("/api/regist", auth.regist)

// クロノロジー機能
app.get("/api/review", review.get_review_data);
app.get("/api/record/:cmd", review.record_cmd);

// チャット
app.post(chat.api_url, chat.talk_history);

// 管理画面用API
// app.get("/api/jsonFileName", admin.jsonFileName);
// app.get("/api/jsonFileNameUsers", admin.jsonFileNameUsers);
// app.get("/api/jsonData", admin.jsonData);
// app.get("/api/jsonDataUsers", admin.jsonDataUsers);
// app.post("/api/jsonUpdate", admin.jsonUpdate);
// app.post("/api/jsonUpload", admin.jsonUpload);
// app.get("/api/serverUpdate", config.reload_json);
// app.get("/api/logout", websocket.all_logout);
// app.get("/api/fileNameCallRec", admin.fileNameCallRec);
// app.get("/api/fileNameLog", admin.fileNameLog);
// app.get("/api/fileNameMemo", admin.fileNameMemo);
// app.post("/api/callrecDelete", admin.callrecDelete);
// app.post("/api/isDeletable", admin.isDeletable);
// app.post("/api/memoDelete", admin.memoDelete);
// app.get("/api/usersAmt", config.getUsersAmt);

// Vueアプリ
app.use(express.static("dist"));
// 地図データ
app.use("/maps", express.static("maps"));
// メモデータ
app.use("/memo", express.static(memo_path));
// app.post("/api/memos", memo.getMemos);
// 音声データ
app.use("/callrec", express.static(callrec_path));

app.get("/Regist*", (req, res) => {
  res.sendFile("/dist/index.html");
})

// https通信のアライブチェック
// app.get("/api/httpsalive", admin.httpsalive);

// エラーハンドラ
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send("Internal server error");
});

module.exports = app;
