// 軌跡データのSELECT/DELETE処理時間測定
"use strict";

const db = require("../models");
const { Op } = require("sequelize");
const sequelize = db.sequelize;
const Track = db.Track;

// 6ユーザ・10秒周期・31日分の軌跡データ生成
// 6 * 8640 * 31 = 1,607,040行
const tracks = [];
const users = ["00001", "00002", "00003", "00004", "00005", "00006"];
const lat = 45.1;
const lng = 135.2;
const one_day = 86400 * 1000;
const delta = 10 * 1000;
const end = Date.now();
let datetime = end - 31 * one_day;

while (datetime < end) {
  users.forEach(user_id => {
    const row = { datetime, user_id, lat, lng };
    tracks.push(row);
  });
  datetime += delta;
}

// ベンチマーク測定回数
const N = 20;
// ベンチマーク実施
(async () => {
  // 既存データを削除してデータ生成
  await sequelize.sync({ force: true });
  await Track.bulkCreate(tracks, { logging: false });
  // 1日分のデータ検索
  for (let i = 0; i < N; i++) {
    const rows = await Track.findAll({
      where: {
        user_id: "00001",
        datetime: {
          [Op.gte]: end - one_day
        }
      },
      benchmark: true
    });
    console.log(rows.length);
  }
  // 直近の30日分を残してデータ削除
  for (let i = 0; i < N; i++) {
    const deleted = await Track.destroy({
      where: {
        datetime: {
          [Op.lt]: end - 30 * one_day
        }
      },
      benchmark: true
    });
    console.log(deleted);
  }
})();

// テーブル定義変更前のベンチマーク結果 @Lenovo_L590
// PRIMARY KEY (`user_id`, `datetime`)
// DELETEがインデクスを利用できず低速
//
// Executing (default): DROP TABLE IF EXISTS `track`;
// Executing (default): DROP TABLE IF EXISTS `track`;
// Executing (default): CREATE TABLE IF NOT EXISTS `track` (`user_id` VARCHAR(255) NOT NULL, `datetime` DATETIME NOT NULL, `lng` FLOAT NOT NULL, `lat` FLOAT NOT NULL, PRIMARY KEY (`user_id`, `datetime`));
// Executing (default): PRAGMA INDEX_LIST(`track`)
// Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_track_1`)
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 87ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 103ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 88ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 87ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 87ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 88ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 86ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 88ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 90ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 103ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 99ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 97ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 88ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 87ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 89ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 86ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 87ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 86ms
// 8640
// Executed (default): SELECT `user_id`, `datetime`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:47:06.308 +00:00'; Elapsed time: 95ms
// 8640
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 7545ms
// 51840
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 551ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 620ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 557ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 539ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 538ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 535ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 541ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 551ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 542ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 543ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 541ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 634ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 548ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 541ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 543ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 542ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 540ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 550ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:47:06.308 +00:00' Elapsed time: 542ms
// 0

// テーブル定義変更後のベンチマーク結果 @Lenovo_L590
// PRIMARY KEY (`datetime`, `user_id`)
// SELECTは若干遅くなったがDELETEの速度改善
//
// Executing (default): DROP TABLE IF EXISTS `track`;
// Executing (default): DROP TABLE IF EXISTS `track`;
// Executing (default): CREATE TABLE IF NOT EXISTS `track` (`datetime` DATETIME NOT NULL, `user_id` VARCHAR(255) NOT NULL, `lng` FLOAT NOT NULL, `lat` FLOAT NOT NULL, PRIMARY KEY (`datetime`, `user_id`));
// Executing (default): PRAGMA INDEX_LIST(`track`)
// Executing (default): PRAGMA INDEX_INFO(`sqlite_autoindex_track_1`)
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 99ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 102ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 102ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 100ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 119ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 130ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 115ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 111ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 111ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 102ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 102ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 101ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 100ms
// 8640
// Executed (default): SELECT `datetime`, `user_id`, `lng`, `lat` FROM `track` AS `Track` WHERE `Track`.`user_id` = '00001' AND `Track`.`datetime` >= '2020-08-13 13:49:40.773 +00:00'; Elapsed time: 102ms
// 8640
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 889ms
// 51840
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 2ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 1ms
// 0
// Executed (default): DELETE FROM `track` WHERE `datetime` < '2020-07-15 13:49:40.773 +00:00' Elapsed time: 0ms
// 0
