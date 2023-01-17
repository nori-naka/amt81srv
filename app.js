#!/usr/bin/env node

// dataフォルダ作成 @todo データ初期化はあちこちでやらずにまとめる
// recursive: trueを設定しておけばディレクトリが存在していてもエラーにならない
const store_path = "data";

const fs = require("fs");
fs.mkdirSync(store_path, { recursive: true });

const app = require("./server/app");
const websock = require("./server/websock");
// const SSL_KEY = "cert/server.key";
// const SSL_CERT = "cert/server.crt";
// const https = require("https");
// const options = {
//   key: fs.readFileSync(SSL_KEY).toString(),
//   cert: fs.readFileSync(SSL_CERT).toString()
// };
const http = require("http");
// const https_port = 443;
const http_port = 80;
const { version } = require("./package.json");

// 起動ログ
const { logger} = require("./server/logger");
// const logger = console;
logger.info(`${Date()}:エアマルチトークサーバ起動 v${version}`);

const server = http.createServer(app);

app.set("port", process.env.PORT || http_port);

//Web Socket Server
websock.websocket(server);

// HTTPS+WSサーバ起動
// DBがなければサーバ起動前に作る
// const db = require("../server/models");
// db.sequelize.sync().then(() =>
//   server.listen(app.get("port"), function() {
//     console.log("Express server listening on port " + server.address().port);
//   })
// );
server.listen(app.get("port"), function() {
  console.log("Express server listening on port " + server.address().port);
});
