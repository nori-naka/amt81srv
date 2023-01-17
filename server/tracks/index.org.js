"use strict";

const db = require("../models");
const Track = db.Track;
const moment = require("moment");
const { Op } = require("sequelize");
// const logger = require("../logger");
const { logger, logDebug, log, logError } = require("../logger");


// 軌跡
const tracks = {};
const TRACK_LOG_LIMIT = 21600;
const userHash = {};
const ttlVal = 90;
exports.getUserHash = () => { return userHash; }
exports.delUserHash = (id) => { delete userHash[id]; }

// ログインしたユーザの設定データを取得する
exports.getTracks = async function(req, res) {
  try {
    var user_id = req.body.userId;
    // ORMが受け付けられる形式に変換
    var begin = moment(req.body.begin).format();
    var end = moment(req.body.end).format();

    let Tracks = await Track.findAll({
      where: {
        user_id: user_id,
        datetime: {
          [Op.gte]: begin,
          [Op.lt]: end
        }
      }
    });
    let res_data = [];

    Tracks.forEach((data, i) => {
      let res_data_tmp = {};
      res_data_tmp = {
        datetime: moment(data.datetime).utc(),
        lng: data.lng,
        lat: data.lat
      };
      res_data.push(res_data_tmp);
    });

    res.send(res_data);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

// 指定ユーザの最終位置を返す
// exports.getLastPosition = async function(user_id) {
//   try {
//     const track = await Track.findOne({
//       attributes: ["datetime", "lat", "lng"],
//       order: [["datetime", "DESC"]],
//       where: { user_id }
//     });
//     return track;
//   } catch (e) {
//     return null;
//   }
// };

// DBにデータを保存する
const cron = require("node-cron");
let track_db_userid = [];
let track_db_data = [];
let db_datetime = null;
// cron.schedule('* * * * *',
cron.schedule("0,10,20,30,40,50 * * * *", function() {
  // 軌跡のデータが保存されているかを確認
  // if(track_db_userid.length !== 0) {
  // 軌跡のデータをDBへ保存
  db_datetime = Date.now();
  for (const db_userid of track_db_userid) {
    track_db_data[db_userid];
    try {
      _createdb(db_userid, track_db_data[db_userid], db_datetime);
    } catch (e) {
      log(e);
    }
  }
  track_db_userid = [];
  track_db_data = [];

  // }
});

const _createdb = async (db_userid, track_db_data, db_datetime) => {
  const track_data = {
    user_id: db_userid,
    lat: track_db_data.lat,
    lng: track_db_data.lng,
    timestamp: track_db_data.timestamp,
    datetime: db_datetime
  };
  try {
    const created = await Track.create(track_data);
    log(`Track create OK: (id: ${created.user_id})`);
  } catch (error) {
    // 位置情報の更新とrenewの発行は非同期なので、
    // 前回と同じタイムスタンプで位置情報が通知されてくることがある
    // DBの一意制約に引っかかるがエラーではないのでSKIPのログを出す
    if (error instanceof db.Sequelize.UniqueConstraintError) {
      log("Track create SKIP(duplicated)");
    } else {
      logError("Track create NG:");
      logError(track_data);
      throw new Error(error); // 呼び出し元でcatchしているのでスローする
    }
  }
};

// 2点間の距離（返値はkm）
const distance = (lat1, lng1, lat2, lng2) => {
  lat1 *= Math.PI / 180;
  lng1 *= Math.PI / 180;
  lat2 *= Math.PI / 180;
  lng2 *= Math.PI / 180;
  return (
    6371 *
    Math.acos(
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) +
        Math.sin(lat1) * Math.sin(lat2)
    )
  );
}

const on_track_data = (data) => {
  // DBに格納するデータを作成 (10分毎のデータを作成)
  if (!track_db_data[data.user_id]) {
    track_db_userid.push(data.user_id);
    track_db_data[data.user_id] = {
      lat: data.lat + ",",
      lng: data.lng + ",",
      timestamp: data.timestamp + ","
    };
  } else {
    track_db_data[data.user_id] = {
      lat: track_db_data[data.user_id].lat + data.lat + ",",
      lng: track_db_data[data.user_id].lng + data.lng + ",",
      timestamp:
        track_db_data[data.user_id].timestamp + data.timestamp + ","
    };
  }
}

// 軌跡描画データ送信
exports.on_track = (msg, socket) => {
  const data = JSON.parse(msg);
  // data = {user_id1: point_num1, user_id2: point_num2, ...user_id_N: point_num_N,}

  const send_track = {};

  // msgから要求されたユーザIDを抽出
  Object.keys(data).forEach(function(user_id) {
    if (!tracks[user_id] || !tracks[user_id].coords) return;

    // trackは最新が若番、最古が末尾になる。
    const point_num = data[user_id].point_num;
    const track_color = data[user_id].color;
    const track_group = data[user_id].group_id;
    // const track_len = tracks[user_id].coords.length;
    send_track[user_id] = {
      width: 5,
      color: track_color,
      type: "LineString",
      id: `track_${user_id}`,
      // coords: tracks[user_id].coords.slice(track_len - point_num, track_len),
      coords: tracks[user_id].coords.slice(0, point_num),
      radius: null,
      group: track_group
    };
  });
  // console.log(`SEND TRACK=${JSON.stringify(send_track)}`);
  socket.emit("track", JSON.stringify(send_track));
};

exports.on_renew = (msg, socket) => {
  var data = JSON.parse(msg);
  // 無効な内容のメッセージが送られてくることがあるので破棄
  if (!data.user_id) return;

  // グループに変化があった場合はsocketのleaveとjoinを行う
  // mapGroupId...前回値　data.group_id...最新値
  const mapGroupId = userHash[data.user_id] ? userHash[data.user_id].group_id : null;
  if (data.group_id != mapGroupId) {
    if (mapGroupId != null) {
      socket.leave(String(mapGroupId));
    }
    if (data.group_id != null) {
      socket.join(String(data.group_id));
    }
    // mapGroupId = data.group_id;
  }

  // ユーザIDとソケットIDを紐づけ
  // user_sid[data.user_id] = socket.id;
  // user_sid[data.user_id] = socket.id;
  // // サーバ→クライアントのrenew通知内容
  userHash[data.user_id] = { ...data, ttl: ttlVal, sid: socket.id }

  // 異常値検出用のフラグ
  let error_flg = true;
  // 軌跡蓄積
  // そもそも緯度経度が計測出来ている時
  if (data.lat && data.lng) {
    if (tracks[data.user_id]) {
      // そもそも、tracks[id].coordsはある？
      if (tracks[data.user_id].coords) {
        const first_point = tracks[data.user_id].coords[0];

        if (first_point[0] != data.lat || first_point[1] != data.lng) {

          log(`${data.user_id}: first_pointからは移動したみたいだよ`);
          const m_speed =
            distance(first_point[0], first_point[1], data.lat, data.lng) /
            (data.timestamp - first_point[2]);

          log(`${data.user_id} / ${m_speed}: 速度`);
          tracks[data.user_id].coords.unshift([
            data.lat,
            data.lng,
            data.timestamp
          ]);
          error_flg = false;
          if (tracks[data.user_id].coords.length > TRACK_LOG_LIMIT) {
            tracks[data.user_id].coords.pop();
          }
        }
      } else {
        tracks[data.user_id].coords = [
          [data.lat, data.lng, data.timestamp]
        ];
        // log("初回は入ったよ。");
      }
    } else {
      tracks[data.user_id] = {
        coords: [[data.lat, data.lng, data.timestamp]]
      };
      // log("更なる初回");
    }

    // DBに格納するデータを作成 (10分毎のデータを作成)
    on_track_data(data);
  }
}
