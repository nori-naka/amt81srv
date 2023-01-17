"use strict";

// https://nodejs.org/dist/latest-v10.x/docs/api/fs.html#fs_fs_promises_api
const fs = require("fs");
const path = require("path");
// const { getLastPosition } = require("./tracks");

// const config_dir = "./user_config";

// const auth = require("./auth");
// const logger = require("./logger");
// const websocket = require("./websock");

// async function getConfigDataAsync(login_id) {
//   // 全ユーザのデフォルト値読み込み
//   const all_users = `${config_dir}/all_users.json`;
//   const defaults = JSON.parse(await fs.promises.readFile(all_users, "utf8"));
//   // 個別ユーザの設定ファイル読み込み
//   const user_path = `${config_dir}/users/${login_id}.json`;
//   const user_config = JSON.parse(await fs.promises.readFile(user_path, "utf8"));
//   // デフォルト値を個別設定で上書きする
//   const merged = Object.assign(defaults, user_config);
//   // 最終位置を追加
//   // merged.last_position = await getLastPosition(user_config.user_id);
//   return merged;
// }

// // ログインしたユーザの設定データを取得する
// exports.getConfig = function(req, res) {
//   const login_id = req.user;
//   getConfigDataAsync(login_id)
//     .then(function(data) {
//       res.send(data);
//     })
//     .catch(function(err) {
//       console.log(err);
//       res.status(500).end();
//     });
// };

// 非AMTユーザ：
// 現行の仕組みでは、端末側からのrenew通知が無いと、位置アイコン等が表示されない。
// よって、以下の動作に変更する。
// ・まず、設定を全部読み込み、user_infoにマージする。
// ・getConfigはuser_infoより読み出してAMTユーザに返す。
// ・AMTユーザはrenew通知をサーバに行い、userHashにマージする。
// ・非AMTユーザ分は、起動時にuserHashにマージする。

// renew通知を上げない端末の位置を地図表示するために、renew以外の方法を行うユーザが非AMTユーザである。
// よって、ログインしないユーザとして、PSTNユーザの場合等が該当する。
// PSTNユーザには、260MHz帯移動局も含まれる。
// 260MHz帯移動局の場合、サーバからのrenew通知で各端末に通知され、緯度経度情報は更新される。
// 非AMTユーザの場合、サーバへのrenew通知が無いため、サーバ側でrenew通知に
// 非AMTユーザの緯度経度をマージする必要がある。

// config.js:非ATMユーザの設定情報の読み出しを行い、JSONフォーマットにマージする
// websock.js:JSONフォーマットをuserHashにマージし、renew通知を行う。

// ----------------------------------------------------------------------------
// Heroku使用時は保存フォルダをtmpにする。
// ----------------------------------------------------------------------------
// App Service 使用時は保存フォルダを/home/dataにする。
// ----------------------------------------------------------------------------
// exports.save_path = "data";
// exports.save_path = "tmp"; // Heroku
exports.save_path = "data"


const user_config_path = "./user_config/users";
const system_config = "./user_config/all_users.json";
const config_by_login_id = {};
const config_by_user_id = {};

let config = require("../user_config/server.json");
// メモクラス名の初期値
let memo_class = config.default_memo_class;

// JSONの情報
const config_update = async () => {
  await delete require.cache[require.resolve("../user_config/server.json")];
  config = await require("../user_config/server.json");
  memo_class = config.default_memo_class;
};
exports.getMemo_class = () => {
  return memo_class;
}

exports.reload_json = async function(req, res) {
  try {
    // auth/index.jsで使われている　secrets.jsonを更新
    config_update();

    // /users直下とall_usersのリセット
    init_userHash();

    res.send(200);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};


const login_users = {};
const init_userHash = async () => {
  try {
    // システム全体で共通の設定を読み込む
    const all_users = path.join(system_config);
    const defaults = JSON.parse(await fs.promises.readFile(all_users, "utf8"));

    // "../user_config/users"配下のJSONファイル名の一覧を取得
    const files = await fs.promises.readdir(user_config_path);
    const json_files = files.filter(function(file) {
      const fp = path.join(user_config_path, file);
      return fs.statSync(fp).isFile() && /\.json$/.test(fp);
    });
    const login_ids = json_files.map(function(file_name) {
      return file_name.replace(/\.json$/, "");
    });
    console.log(`json_files:${json_files}`);
    console.log(`login_ids:${login_ids}`);

    json_files.forEach(async (json_file, index) => {
      // 個別ユーザの設定ファイル読み込み
      const user_path = path.join(user_config_path, json_file);
      const user_json_file = JSON.parse(
        await fs.promises.readFile(user_path, "utf8")
      );
      // login_idとuser_idを結ぶ
      login_users[login_ids[index]] = user_json_file.user_id;
      // デフォルト値を個別設定で上書きする
      // const user_config = Object.assign(defaults, user_json_file);
      config_by_login_id[login_ids[index]] = { ...defaults, ...user_json_file };
      if (user_json_file.user_type != "amt") {
        const {
          user_id,
          user_type,
          user_name,
          group_id,
          default_lat,
          default_lng,
          myIcon,
          tel_type,
          tel_code
        } = { ...defaults, ...user_json_file };
        config_by_user_id[user_json_file.user_id] = {
          user_id: user_id,
          user_type: user_type,
          user_name: user_name,
          group_id: group_id,
          lat: default_lat,
          lng: default_lng,
          myIcon: myIcon,
          tel_type: tel_type,
          tel_code: tel_code
        };
      }
    });
    console.log(config_by_user_id);
    return config_by_user_id;
  } catch (err) {
    console.log(err);
  }
};
exports.get_userHash = init_userHash;


// console.table(config_by_login_id);
// console.table(config_by_user_id);
// ログインしたユーザの設定データを取得する
exports.getConfig = async function(req, res) {
  // const login_id = req.user;
  const login_id = await req.body.user;
  try {
    res.send(config_by_login_id[login_id]);
  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
};

// ログインしたユーザの設定データを取得する
exports.getUsersAmt = function(req, res) {
  try {
    const dirPath_users = "./user_config/users";
    const allDirents_users = fs.readdirSync(dirPath_users, {
      withFileTypes: true
    });
    const fileNames_users = allDirents_users
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);
    let filename;
    let data;
    let data_a = [];

    for (let i = 0; i < fileNames_users.length; i++) {
      filename = fileNames_users[i];
      data = JSON.parse(
        fs.readFileSync("./user_config/users/" + filename, "utf8")
      );
      if (data.user_type === "amt") {
        data_a.push({ id: data.user_id, name: data.user_name });
      }
    }
    res.send(data_a);
  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
};

const get_login_id_by_user_id = () => { return login_users }
exports.get_login_id_by_user_id = get_login_id_by_user_id;
