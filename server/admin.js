"use strict";

const fs = require("fs");
const config = require("./config");
const db = require("./models");
const Memo = db.Memo;
const websock = require("./websock");
const { logger } = require("./logger");

const JSONLint = require("json-lint");

// 分類名を取得する
exports.jsonFileName = function(req, res) {
  try {
    const dirPath = "./user_config";
    const allDirents = fs.readdirSync(dirPath, { withFileTypes: true });
    const fileNames = allDirents
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);

    res.send(fileNames);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

exports.jsonFileNameUsers = function(req, res) {
  try {
    const dirPath_users = "./user_config/users";
    const allDirents_users = fs.readdirSync(dirPath_users, {
      withFileTypes: true
    });
    const fileNames_users = allDirents_users
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);

    res.send(fileNames_users);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

exports.fileNameCallRec = function(req, res) {
  try {
    const dirPath_callrec = "./data/callrec";
    const allDirents_callrec = fs.readdirSync(dirPath_callrec, {
      withFileTypes: true
    });
    const fileNames_callrec = allDirents_callrec
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);

    res.send(fileNames_callrec);
  } catch (e) {
    logger.error(e);
    res.send(500);
  }
};

exports.fileNameLog = function(req, res) {
  try {
    const dirPath_log = "./data/log";
    const allDirents_log = fs.readdirSync(dirPath_log, {
      withFileTypes: true
    });
    const fileNames_log = allDirents_log
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);

    res.send(fileNames_log);
  } catch (e) {
    logger.error(e);
    res.send(500);
  }
};

exports.fileNameMemo = function(req, res) {
  try {
    const dirPath_memo = "./data/memo";
    const allDirents_memo = fs.readdirSync(dirPath_memo, {
      withFileTypes: true
    });
    const fileNames_memo = allDirents_memo
      .filter(dirent => dirent.isFile())
      .map(({ name }) => name);

    res.send(fileNames_memo);
  } catch (e) {
    logger.error(e);
    res.send(500);
  }
};

exports.callrecDelete = function(req, res) {
  const param_obj = JSON.parse(req.body.data);
  const file_name = param_obj.file_name;
  const data_type = param_obj.data_type;
  let file;

  logger.info(
    `Run callrec file delete: file_name=${file_name}, data_type=${data_type}`
  );

  if ("callrec_audio" === data_type) {
    // 音声データ
    file = file_name + ".webm";
  } else if ("callrec_text" === data_type) {
    // テキスト
    file = file_name + ".txt";
  } else {
    // 不正データタイプ
    logger.error(`Invalid type ${data_type}`);
    res.status(400).send(`Invalid type ${data_type}`);
    return;
  }
  const callrec_path = "./data/callrec/" + file;

  try {
    // ファイル削除
    fs.unlinkSync(callrec_path);
    console.log(`Delete callrec: ${file}`);
    res.status(200).send("Delete success");
  } catch (e) {
    console.error(e);
    logger.error(`File delete error: ${file}`);
    res.status(500).send("File delete error");
  }
};

exports.isDeletable = function(req, res) {
  const param_obj = JSON.parse(req.body.data);
  const file_name = param_obj.file_name;
  const data_type = param_obj.data_type;

  // DBから対象メモの表示状態を探す
  try {
    Memo.findOne({
      where: {
        id: file_name
      }
    })
      .then(function(db_data) {
        let display_flag;
        if (!db_data) {
          // data/memoにファイルはあるがDBに登録されていない(異常系)
          // ひとまず非表示状態ということにして画面上の警告をスキップしてファイルを消す
          logger.warn(`${file_name} is unknown`);
          display_flag = 0;
        } else {
          // 表示フラグを返す
          display_flag = db_data.dataValues.display_flag;
        }
        const ret = {
          display_flag: display_flag
        };
        res.status(200).send(ret);
      })
      .catch(function(error) {
        // DB検索エラー => 外のcatchに再throw
        throw new Error(error);
      });
  } catch (e) {
    console.error(e);
    if ("photo_memo" === data_type) {
      logger.error(`File data unknown: ${file_name}.jpg`);
      logger.error(`File data unknown: ${file_name}_photo.txt`);
    } else if ("video_memo" === data_type) {
      logger.error(`File data unknown: ${file_name}.webm`);
      logger.error(`File data unknown: ${file_name}_video.txt`);
      logger.error(`File data unknown: ${file_name}_thumb.jpg`);
    } else {
      logger.error(`File data unknown: ${file_name}.txt`);
    }
    res.status(500).send("File data unknown");
  }
};

exports.memoDelete = function(req, res) {
  const param_obj = JSON.parse(req.body.data);
  const file_name = param_obj.file_name;
  const data_type = param_obj.data_type;

  logger.info(
    `Run memo file delete: file_name=${file_name}, data_type=${data_type}`
  );

  try {
    if ("photo_memo" === data_type) {
      const photo_path = "./data/memo/" + file_name + ".jpg";
      const text_path = "./data/memo/" + file_name + "_photo.txt";
      // DBからさがす
      Memo.findOne({ where: { id: file_name } })
        .then(function(db_data) {
          if (db_data) {
            // DBに登録されていれば削除実行
            db_data
              .destroy()
              .then(function() {
                // RAM上のメモデータも削除して即時反映
                websock.db_update().then(function() {
                  // 写真メモ削除
                  fs.unlinkSync(photo_path);
                  console.log(`Delete photo: ${file_name}.jpg`);
                  fs.unlinkSync(text_path);
                  console.log(`Delete text: ${file_name}_photo.txt`);
                  res.status(200).send("Delete success");
                });
              })
              .catch(function(error) {
                // DB削除エラー => 外のcatchに再throw
                logger.error(`Database delete error: ${file_name}`);
                throw new Error(error);
              });
          } else {
            // DBになければファイルを消すだけ
            // 写真メモ削除
            fs.unlinkSync(photo_path);
            console.log(`Delete photo: ${file_name}.jpg`);
            fs.unlinkSync(text_path);
            console.log(`Delete text: ${file_name}_photo.txt`);
            res.status(200).send("Delete success");
          }
        })
        .catch(function(error) {
          // DB削除エラー => 外のcatchに再throw
          logger.error(`Database delete error: ${file_name}`);
          throw new Error(error);
        });
    } else if ("video_memo" === data_type) {
      const video_path = "./data/memo/" + file_name + ".webm";
      const text_path = "./data/memo/" + file_name + "_video.txt";
      const thumb_path = "./data/memo/" + file_name + "_thumb.jpg";
      // DBからさがす
      Memo.findOne({ where: { id: file_name } })
        .then(function(db_data) {
          if (db_data) {
            // DBに登録されていれば削除実行
            db_data
              .destroy()
              .then(function() {
                // RAM上のメモデータも削除して即時反映
                websock.db_update().then(function() {
                  // 映像メモ削除
                  fs.unlinkSync(video_path);
                  console.log(`Delete video: ${file_name}.webm`);
                  fs.unlinkSync(text_path);
                  console.log(`Delete text: ${file_name}_video.txt`);
                  fs.unlinkSync(thumb_path);
                  console.log(`Delete thumbnail: ${file_name}_thumb.jpg`);
                  res.status(200).send("Delete success");
                });
              })
              .catch(function(error) {
                // DB削除エラー => 外のcatchに再throw
                logger.error(`Database delete error: ${file_name}`);
                throw new Error(error);
              });
          } else {
            // DBになければファイルを消すだけ
            // 映像メモ削除
            fs.unlinkSync(video_path);
            console.log(`Delete video: ${file_name}.webm`);
            fs.unlinkSync(text_path);
            console.log(`Delete text: ${file_name}_video.txt`);
            fs.unlinkSync(thumb_path);
            console.log(`Delete thumbnail: ${file_name}_thumb.jpg`);
            res.status(200).send("Delete success");
          }
        })
        .catch(function(error) {
          // DB削除エラー => 外のcatchに再throw
          logger.error(`Database delete error: ${file_name}`);
          throw new Error(error);
        });
    } else if ("text_memo" === data_type) {
      const text_path = "./data/memo/" + file_name + ".txt";
      // DBからさがす
      Memo.findOne({ where: { id: file_name } })
        .then(function(db_data) {
          if (db_data) {
            // DBに登録されていれば削除実行
            db_data
              .destroy()
              .then(function() {
                // RAM上のメモデータも削除して即時反映
                websock.db_update().then(function() {
                  // 写真メモ削除
                  fs.unlinkSync(text_path);
                  console.log(`Delete text: ${file_name}.txt`);
                  res.status(200).send("Delete success");
                });
              })
              .catch(function(error) {
                // DB削除エラー => 外のcatchに再throw
                logger.error(`Database delete error: ${file_name}`);
                throw new Error(error);
              });
          } else {
            // DBになければファイルを消すだけ
            // 写真メモ削除
            fs.unlinkSync(text_path);
            console.log(`Delete text: ${file_name}.txt`);
            res.status(200).send("Delete success");
          }
        })
        .catch(function(error) {
          // DB削除エラー => 外のcatchに再throw
          logger.error(`Database delete error: ${file_name}`);
          throw new Error(error);
        });
    } else {
      // 不正データタイプ
      logger.error(`Invalid type ${data_type}`);
      res.status(400).send(`Invalid type ${data_type}`);
    }
  } catch (e) {
    console.error(e);
    if ("photo_memo" === data_type) {
      logger.error(`File delete error: ${file_name}.jpg`);
      logger.error(`File delete error: ${file_name}_photo.txt`);
    } else if ("video_memo" === data_type) {
      logger.error(`File delete error: ${file_name}.webm`);
      logger.error(`File delete error: ${file_name}_video.txt`);
      logger.error(`File delete error: ${file_name}_thumb.jpg`);
    } else if ("text_memo" === data_type) {
      logger.error(`File delete error: ${file_name}.txt`);
    }
    res.status(500).send("File delete error");
  }
};

exports.jsonData = function(req, res) {
  try {
    const filename = req.query.filename;
    const data = JSON.parse(
      fs.readFileSync("./user_config/" + filename + ".json", "utf8")
    );

    res.send(data);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

exports.jsonDataUsers = function(req, res) {
  try {
    const filename = req.query.filename;
    const data = JSON.parse(
      fs.readFileSync("./user_config/users/" + filename + ".json", "utf8")
    );

    res.send(data);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

exports.jsonUpdate = async function(req, res) {
  try {
    const filename = req.query.filename;
    const isUsers = req.query.isUsers;
    const str = JSON.stringify(req.body.jsonFile, null, 2);
    const str2 = JSON.parse(str);

    const lint2 = JSONLint(str2);
    if (lint2.error) {
      // エラーが発生して,エラーメッセージを表示する
      console.log(lint2.error, lint2.line, lint2.character);
      res.send(lint2);
    }
    if (isUsers == "true") {
      await fs.writeFile(
        "./user_config/users/" + filename + ".json",
        str2,
        function(err) {
          if (err) {
            throw err;
          }
        }
      );
    } else {
      await fs.writeFile("./user_config/" + filename + ".json", str2, function(
        err
      ) {
        if (err) {
          throw err;
        }
      });
    }

    res.send(200);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

exports.jsonUpload = async function(req, res) {
  try {
    const filename = req.query.filename;
    const target = req.query.target;
    const str = JSON.stringify(req.body.file_body, null, 2);
    const str2 = JSON.parse(str);

    const lint2 = JSONLint(str2);
    if (lint2.error) {
      // エラーが発生して,エラーメッセージを表示する
      console.log(lint2.error, lint2.line, lint2.character);
      res.send(lint2);
    }
    console.log("***********");
    console.log(filename);
    console.log(target);
    console.log("***********");
    if (target === "user_config") {
      await fs.writeFile("./user_config/" + filename + ".json", str2, function(
        err
      ) {
        if (err) {
          throw err;
        }
      });
    } else if (target === "users") {
      await fs.writeFile(
        "./user_config/users/" + filename + ".json",
        str2,
        function(err) {
          if (err) {
            throw err;
          }
        }
      );
    }

    res.send(200);
  } catch (e) {
    console.log(e);
    res.send(500);
  }
};

// アライブチェック
exports.httpsalive = function(req, res) {
  try {
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
};
