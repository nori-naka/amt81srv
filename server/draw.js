"use strict";
// const logger = require("./logger");
const { logger, logDebug, log, logError } = require("./logger");
const { store_tm } = require("./review");

let allDraw = [];

// 手書き
exports.on_draw = function(jsonData, socket) {
  log("[DRAW]" + jsonData);
  socket.broadcast.emit("draw", jsonData);
  store_tm("draw", jsonData);

  const newData = JSON.parse(jsonData);
  allDraw = allDraw.filter(data => data.id != newData.id);
  allDraw.push(newData);
};

exports.on_erase = function(id, socket) {
  log("[ERASE]" + id);
  socket.broadcast.emit("erase", id);
  store_tm("erase", id);

  allDraw = allDraw.filter(data => data.id != id);
};

// 描画画面初期化
exports.on_initdraw = function(socket) {
  log("[REDRAW]");
  socket.emit("alldraw", JSON.stringify(allDraw));
  store_tm("alldraw", JSON.stringify(allDraw));

  console.log("-----------------------REDRAW-----------------------------------");
  console.log(allDraw);
};
