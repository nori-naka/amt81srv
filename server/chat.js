'use strict';
const { getUserHash, delUserHash } = require("./tracks");

const api_url = "/api/chat";
exports.api_url = api_url;
const talks = {};
const talks_limit = 500;

// exports.on_chat_msg = (msg, socket) => {
exports.on_chat_msg = (io, msg) => {
  console.dir(msg);
  // const userHash = getUserHash()

  if (!talks[msg.group_id]) talks[msg.group_id] = [];
  const talks_in_id = talks[msg.group_id];

  // トーク内容のリセット
  if (msg.msg ===  "$$reset$$") {
    Object.keys(talks).forEach(group_id => {
      talks[group_id] = [];
    });
  } else {
    talks_in_id.push(msg);
    if (talks_in_id.length > talks_limit) {
      talks_in_id.shift();
    }
  }

  // Object.keys(userHash).forEach(id => {
  //   if (id === "system") return;

  //   if(userHash[id].group_id === msg.group_id) {
  //     socket.to(userHash[id].sid).emit("chat_msg", msg);
  //   }
  // });
  // socket.emit("chat_msg", msg);
  io.emit("chat_msg", msg);
}

const talk_history = (req, res, next) => {
  console.log(req.body);
  console.log(talks)
  const group_id = req.body.group_id;
  res.status(200).json(talks[group_id]);
};
exports.talk_history = talk_history;