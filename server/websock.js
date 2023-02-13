"use strict";

const fs = require("fs");
const { promisify, isNumber } = require("util");

const { on_log, logger, logDebug, log, logError } = require("./logger");
const { sendMemo, upMemo, delMemo } = require("./memo");
const { on_renew, on_track, on_inittrack } = require("./tracks");
// const { init_db } = require("./db");
const origin_list = require("../user_config/server.json").origin || [""];

const config_js = require("./config");
const { getUserHash, delUserHash } = require("./tracks");
const { on_draw, on_erase, on_initdraw } = require("./draw");
const { store_tm, get_record_state } = require("./review");
const { on_share, on_share_draw } = require("./share");
const { on_chat_msg } = require("./chat");
// const e = require("express");

// const memo_path = memo.memo_path;
// // メモクラス名の初期値
// const memo_class = config.default_memo_class;

// // 軌跡データの保持期間[ms]
// //  0 に設定すると軌跡データをDBに保存しない
// // -1 に設定すると軌跡データを削除しない
// const track_data_ttl = config.track_data_ttl_ms;
// // 軌跡データの削除周期[ms]
// const track_del_interval = config.track_del_interval_ms;

// let socket_a = [];
// // サーバーの更新にあわせてファイルを更新
// exports.all_logout = async function(req, res) {
//   try {
//     for (let i = 0; i < socket_a.length; i++) {
//       socket_a[i].emit("unauthorized", { reason: "logoutAPI" });
//     }
//     res.status(200).end();
//   } catch (err) {
//     console.log(err);
//     res.status(500).end();
//   }
// };

// module.exports = function(server) {
const websock = async server => {

  // ユーザ管理ハッシュ
  config_js.get_userHash().then(data => {
    // userHash = data;
    console.log(data);
  });

  // ---------------------------------------------------------------------------
  // App Service時、内部はHTTP稼働のため、SSL化は不要
  // ---------------------------------------------------------------------------
  // const SSL_KEY = "cert/server.key";
  // const SSL_CERT = "cert/server.crt";
  // const options = {
  //   key: fs.readFileSync(SSL_KEY).toString(),
  //   cert: fs.readFileSync(SSL_CERT).toString(),
  //   // ca: fs.readFileSync('ca.crt'),
  //   // requestCert: true,       // クライアント認証（true:する, false:しない）
  //   rejectUnauthorized: false // 認証失敗時に破棄（true:する, false:しない）
  // };
  // const io = require("socket.io")(server, {
  //   ...options,
  //   cors: {
  //     // origin: "*",
  //     // origin: "https://localhost:3000",
  //     // origin: "https://4nbx6j.csb.app",
  //     origins: origin_list,
  //     credentials: true,
  //     methods: ["GET", "POST"]
  //   }
  // });

  const on_publish = (msg, socket) => {
    log(
      `ON PUBLISH: SRC=${msg.src} DEST=${msg.dest} TYPE=${msg.type} KIND=${msg.kind}`
    );
    const userHash = getUserHash()
    // if (!Object.keys(userHash).includes(msg.src)) {
    //   userHash[msg.src].sid = socket.id;
    // }
    if (userHash[msg.dest]) {
      socket.to(userHash[msg.dest].sid).emit("publish", msg);
    }
  };

  const io = require("socket.io")(server)
  exports.io = io;
  
  // イベントの定義
  io.sockets.on("connection", function(socket) {
    log("CONNECTION Socket ID: " + socket.id);

    // クライアントからjoinメッセージを受信して認証情報のチェックを行ってから
    // 各種メッセージのハンドラを有効にする
    // 認証失敗したクライアントからのメッセージは無視される
    socket.on("join", msg => {
      // 多重ログインの識別に使用するブラウザのタブごとにユニークなID
      const cid = msg.client_id;
      // WS接続ごとにユニークなID
      const sid = socket.id;
      // let mapGroupId = null;

      // 切断
      socket.on("disconnect", function(reason) {
        log(`DISCONNECT msg=${reason} socket.id=${socket.id}`);

        const userHash = getUserHash();
        Object.keys(userHash).forEach(function(_id) {
          if (userHash[_id].sid == socket.id) {
            // delete userHash[_id];
            delUserHash(_id);
            // delete user_sid[_id];
          }
        });
      });

      socket.on("message", msg => {
        console.dir(msg);
        // socket.to(msg.group_id).emit("message", msg);
        const userHash = getUserHash();
        Object.keys(userHash).forEach(id => {
          if(userHash[id].group_id === msg.group_id) {
            socket.to(userHash[id].sid).emit("message", msg);
          }
        })
        store_tm("message", msg);
      });

      socket.on("renew", msg => {
        on_renew(msg, socket)
      });
      socket.on("publish", msg => on_publish(msg, socket));
      socket.on("share", msg => on_share(msg, socket));
      socket.on("share_draw", msg => on_share_draw(msg, socket));
      // socket.on("track", msg => {
      //   store_tm("track", msg);
      //   on_track(msg, socket)
      // });
      socket.on("inittrack", () => on_inittrack(socket));
      socket.on("draw", msg => on_draw(msg, socket));
      socket.on("erase", msg => on_erase(msg, socket));
      socket.on("initdraw", () => on_initdraw(socket));
      socket.on("upMemo", msg => upMemo(io, msg));
      socket.on("delMemo", id => delMemo(io, id));
      socket.on("initmemo", () => sendMemo(socket));
      socket.on("log", msg => on_log(msg));
      // socket.on("chat_msg", msg => on_chat_msg(msg, socket));
      socket.on("chat_msg", msg => on_chat_msg(io, msg));
    });
  });

  // 生存情報送信
  const send_renew = (on_time) => {
    const userHash = getUserHash();
    // console.log(userHash);

    // 各ユーザのTTLを一つ減らす。TTLが0以下になると、ユーザを削除する
    // 応答が有った際にTTLは90になる。
    // renew通知周期を2秒とした場合、3分間応答が無ければ、TTLが0となり、ユーザは削除される。
    Object.keys(userHash).forEach((id) => {
      if (id !== "time") {
        userHash[id].ttl = userHash[id].ttl - 1;
        if (userHash[id].ttl < 0) {
          delete userHash[id];
          //delete user_sid[id];
          log(`DELETE id=${id} USER_HASH=${JSON.stringify(userHash)}`);
        }
      }
    });

    // ユーザIDがsystemの場合、サーバ側の情報を収容する。
    userHash.system = {
      on_time: on_time ? Date.now() : null, // 毎分0秒の時にDate.now()による数値が収容される。録画や軌跡のタイミングとして使用
      on_chronology: get_record_state(),      // クロノロジー録画状態をboole値で収容
    }
    io.sockets.emit("renew", JSON.stringify(userHash));
    store_tm("renew", JSON.stringify(userHash));
  };

  // setInterval(send_renew, 1500);

  setInterval(() => {
    const cur_time = new Date();
    // console.log(`${cur_time.toLocaleTimeString()}`);
    const cur_sec = cur_time.getSeconds()
    if (cur_sec === 0) {
      send_renew(true);
    } else if (cur_sec % 2 === 0 ){
      send_renew(false);
    }
  }, 1000);
}
exports.websocket = websock;
