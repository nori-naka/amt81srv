"use strict";
const fs = require("fs");
const path = require("path");
const { save_path } = require("./config");
const io = () => require("./websock").io;

let tm = {};
let last_stored_time = Date.now();
let record_state = false;
const get_record_state = () => { return record_state };
exports.get_record_state = get_record_state;

const store_tm = (event, msg) => {
  if (record_state) {
    tm[Date.now()] = { event, msg };
    console.log(Object.keys(tm).length);
  } else {
    tm = {};
  }
};
exports.store_tm = store_tm;

// 保存パラメータ
const SAVE_PERIOD = 1000 * 60 * 1; // １分
const SAVE_TM_DIR = `${save_path}/TM/`;
const file_list = [];
let all_file_size = 0;
const limit_all_file_size = 128 * 1024 * 1024; // 保存領域上限128MB

// TM保存フォルダ作成
// フォルダが無ければ作成し、あれば、そのフォルダに存在するファイルをリスト化する
// ここで、add_file_listのcallbackにdel_filesを指定しておけば、
// 保存上限を越えていた場合に古いファイルを削除する。
fs.mkdirSync(SAVE_TM_DIR, { recursive: true });
const init_file_list = (dirpath) => {
  fs.readdir(dirpath, { withFileTypes: true }, (err, dirents) => {
    if (err) {
      console.error(err);
      return;
    }
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) {
        add_file_list(dirent.name, del_files);
      }
    }
  });
  console.log(`TMファイル: ${file_list}`);
};
init_file_list(SAVE_TM_DIR);

const get_file_names = (dirpath) => {
  const allDirents = fs.readdirSync(dirpath, { withFileTypes: true });
  const file_names = allDirents.filter(dirent => dirent.isFile()).map(({ name }) => path.basename(name, ".json"));

  // console.log(`既にフォルダにあるファイル時刻のリストall_t_list:${all_t_list}`);
  return file_names;
};

// 保存上限を越えた場合、最初に保存したファイルから削除を行う。
// 上限を越えている場合には、再帰的に削除を繰り返す
const del_files = () => {
  if (all_file_size < limit_all_file_size) {
    return;
  } else {
    const del_file_stat = file_list.shift();
    fs.unlink(del_file_stat.path, (err) => {
      console.log(err);
      console.log(`DELETE FILE: ${del_file_stat.path}`);
    });
    all_file_size -= del_file_stat.size;
    del_files();
  }
};
// del_filesで削除するファイルを判別するために、ファイル名でリスト作成する
const add_file_list = (file_name, callback) => {
  const fp = path.join(SAVE_TM_DIR, file_name);
  fs.stat(fp, (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(fp); // ファイルパス
    console.log(stats.size); // ファイルサイズ
    console.log(stats.ctime); // 作成時刻
    file_list.push({ time: path.parse(file_name).name, path: fp, size: stats.size });
    all_file_size += stats.size;

    if (callback) callback();
  });
};

// tmの内容をファイルに書き出し、書き出した内容は削除する。
const on_save_tm = () => {
  const _tm = {};
  const next_stored_time = last_stored_time + SAVE_PERIOD;

  const save_arr_t = Object.keys(tm).filter((t) => { return t > last_stored_time && t <= next_stored_time});
  save_arr_t.forEach((t) => {
    _tm[t] = tm[t];
    delete tm[t];
  });

  const data = JSON.stringify(_tm);
  const save_file_name = `${next_stored_time}.json`;
  fs.writeFile(path.join(SAVE_TM_DIR, save_file_name), data, (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log(`FILE WRITE COMPLETE: ${save_file_name}`);
      add_file_list(save_file_name, del_files);
    }
  });
  const del_arr_t = Object.keys(tm).filter(t => { return t <= last_stored_time});
  del_arr_t.forEach((t) => { delete tm[t] });
  last_stored_time = next_stored_time;
};

// クロノロジー機能の記録開始/終了
// 他のログインアカウントから変更された場合には、socket.io経由で即時通知する
let clearId = null;
let last_record_state = null;
const record_cmd = (req, res) => {
  const cmd = req.params.cmd;
  console.log(cmd);

  last_record_state = record_state;
  if (cmd === "start") {
    if (!clearId) clearId = setInterval(on_save_tm, SAVE_PERIOD);
    record_state = true;
    last_stored_time = Date.now();
  } else if (cmd === "stop") {
    if (clearId) clearInterval(clearId);
    clearId = null;
    record_state = false;
    on_save_tm();
  }
  // 状態が変化した場合
  if (last_record_state !== record_state) {
    io().sockets.emit("record", { state: record_state });
  }
  res.send(
    JSON.stringify({
      state: record_state,
      files: file_list,
    })
  );
};
exports.record_cmd = record_cmd;

const get_tm = (stored_time) => {
  try {
    const file_name = path.join(SAVE_TM_DIR, `${stored_time}.json`);
    console.log(`FILE NAME=${file_name}`);
    const data = fs.readFileSync(file_name);
    const json = JSON.parse(data.toString());
    console.log(json);
    return json;
  } catch (err) {
    console.log(err);
  }
};
const get_review_data = (req, res, next) => {
  const start_time = req.query.start;
  const end_time = req.query.end;

  const file_names = get_file_names(SAVE_TM_DIR);
  const arr_t = file_names.filter((t) => {
    // 指定が無い場合、全部返す。
    if (start_time === "0" && end_time === "0") {
      return true;
    } else {
      return t > start_time - SAVE_PERIOD && t <= end_time;
    }
  });
  let tm = {};
  arr_t.forEach((t) => {
    const _tm = get_tm(t);
    tm = { ...tm, ..._tm };
  });

  res.status(200).json(tm);
};
exports.get_review_data = get_review_data;