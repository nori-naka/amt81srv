"use strict";

// const logger = require("../logger");
const { logger, logDebug, log, logError } = require("../logger");

// 軌跡
const tracks = {};
const TRACK_LOG_LIMIT = 60 * 50; // 軌跡保存上限（分）
const TRACK_LEN_LIMIT = 60 * 60 * 2; // 軌跡保存上限（2時間）
const TTL_VAL = 90; // サーバ/クライアント間のTTL
const TRACK_PERIOD = 60000; // 軌跡保存単位(ms)
const SPEED_LIMIT = 300; // GPSのブレ防止。移動時の上限速度（km/h）

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

// 2点間の距離（入力は緯度経度、返値はkm）
const distance = (lat1, lng1, lat2, lng2) => {
  const R = Math.PI / 180;
  lat1 *= R;
  lng1 *= R;
  lat2 *= R;
  lng2 *= R;
  return (
    6371 *
    Math.acos(
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) +
        Math.sin(lat1) * Math.sin(lat2)
    )
  );
}
// 2点間を移動した際の速度（入力は緯度経度と秒、返値は時速km/h）
// pt = [lat, lng, timestamp];
const speed = (pt1, pt2) => {
  if (pt1[2] === pt2[2]) {
    return 0;
  } else {
    const L = distance(pt1[0], pt1[1], pt2[0], pt2[1]);
    const T = Math.abs(pt1[2] - pt2[2]) / 1000;
    console.log(`L=${L}km T=${T}s 時速=${(L / T) * 3600}`);
    return (L / T) * 3600;
  }
};

// 空オブジェクト判定
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

exports.on_inittrack = (socket) => {
  socket.emit("inittrack", JSON.stringify(tracks));
}

// 桁指定切り捨て処理
// n: 切り捨て処理対象数値 t: 桁
const floor = (n, t) => {
  return Math.floor(n / 10 ** t) * 10 ** t;
};

const userHash = {};
exports.getUserHash = () => {
  return userHash;
}
exports.delUserHash = (id) => { delete userHash[id] }

// -- tracks format --
// tracksはid毎にrenew通知を配列で保存しているデータ
// tracks = {id1: renew_data1, id2: renew_data2, ...}
// renew_data = [data1, data2, ...];
// data = {user_id: XXX, user_name: XXX, lat: XXX, lng: XXX, timestamp: nnn} // 一般的なrenew通知

const on_video_flags = {};
const set_on_video = (id, on_video) => { on_video_flags[id] = on_video };
exports.set_on_video = set_on_video;

exports.on_renew = (msg, socket) => {
  var data = JSON.parse(msg);
  // 無効な内容のメッセージが送られてくることがあるので破棄

  const id = data.user_id;
  if (!id) return;

  // グループに変化があった場合はsocketのleaveとjoinを行う
  // mapGroupId...前回値　data.group_id...最新値
  let mapGroupId = userHash[id] ? userHash[id].group_id : null;
  if (data.group_id != mapGroupId) {
    if (mapGroupId != null) {
      socket.leave(String(mapGroupId));
    }
    if (data.group_id != null) {
      socket.join(String(data.group_id));
    }
    console.log(`ID:${id} ROOMS=${socket.rooms}`)
    mapGroupId = data.group_id;
  }
  // ユーザIDとソケットIDを紐づけ
  // // サーバ→クライアントのrenew通知内容

  userHash[id] = {
    ...data,
    ttl: TTL_VAL,
    sid: socket.id,
    on_video_flag: on_video_flags[id]
  };

  // 軌跡蓄積
  // 緯度経度、有効性、タイムスタンプが無効のデータは処理しない
  if (data.is_valid && data.lat && data.lng && data.timestamp) {

    // tracksへの保存
    if (!tracks[id]) {
      tracks[id] = [];
    }
    if (tracks[id].length > 0) {

      tracks[id].unshift(data);
      tracks[id] = [...new Set(tracks[id])];
      if (tracks[id].length > TRACK_LEN_LIMIT) {
        tracks[id].pop();
      }
    } else {
      tracks[id] = [data];
    }
  }
}
