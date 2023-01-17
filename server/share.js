'use strict';
const { logger, logDebug, log, logError } = require("./logger");
const { getUserHash, delUserHash } = require("./tracks");

// メッセージ送信（デスクトップ共有）
const on_share = (msg, socket) => {
  console.log("ON SHARE Msg: " + msg);
  const data = JSON.parse(msg);
  const userHash = getUserHash();
  if (data.dest) {
    socket.to(userHash[data.dest].sid).emit("share", msg);
  } else {
    logError(`ERROR SHARE: ${msg}`);
  }
};

// メッセージ送信（デスクトップ共有）
// 2020 / 11 / 04 nakamura
// 端末側で各dest毎に送信から、ROOM配信に変更
const on_share_draw = (msg, socket) => {
  console.log("ON SHARE DRAW Msg: " + msg);
  const data = JSON.parse(msg);

  if (data.group_id) {
    // socket.broadcast.emit("share_draw", msg);
    // socket.broadcast.to(data.group_id).emit("share_draw", msg);
    const userHash = getUserHash();
    Object.keys(userHash).forEach(id => {
      if (userHash[id].group_id === data.group_id) {
        socket.to(userHash[id].sid).emit("share_draw", msg);
      }
    });
  } else {
    logError(`ERROR SHARE DRAW: ${msg}`);
  }
};

exports.on_share = on_share;
exports.on_share_draw = on_share_draw;