const fs = require("fs");

// DBの場所
const db_file = "sequelize.db"; // DBファイル名
const db_tmp_dir = "./server/tmp/";
const db_dir = "data/";
const db_tmp_path = db_tmp_dir + db_file; // 空DB
const db_path = db_dir + db_file; // データ蓄積DB

exports.init_db = () => {
  // DBのフォルダを作成(すでにあれば何もしない)
  fs.mkdirSync(db_dir, { recursive: true });
  // DBファイルが有るかチェック
  if (!fs.existsSync(db_path)) {
    // DBファイルがなければテンポラリファイルをコピーする
    fs.copyFileSync(db_tmp_path, db_path);
  }
}

