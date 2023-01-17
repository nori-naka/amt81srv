// https://github.com/winstonjs/winston
const winston = require("winston");
// https://github.com/winstonjs/winston-daily-rotate-file
require("winston-daily-rotate-file");
// const config = require("../user_config/server.json");

let config = require("../user_config/server.json");
// サーバーの更新にあわせてファイルを更新
// const config_json = async () => {
//   await delete require.cache[require.resolve("../user_config/server.json")]
//   config = await require("../user_config/server.json");
// }
// exports.config_update = config_json

const { save_path } = require("./config");

// ログファイルのフォーマット定義
const fileFormat = winston.format.printf(info => {
  return `${info.timestamp} [${info.level}] ${info.message}`;
});

// ログファイル出力
// 日毎にローテートして30日分のログを残す
const logToFile = new winston.transports.DailyRotateFile({
  dirname: `${save_path}/log`,
  filename: "AirMultitalk%DATE%.log",
  datePattern: "YYYYMMDD",
  zippedArchive: config.logger_zipped_archive,
  maxFiles: config.logger_max_files,
  format: winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({ format: "YYYY-MM-DD[T]HH:mm:ss.SSS" }),
    fileFormat
  )
});

// コンソール出力
const logToConsole = new winston.transports.Console({
  format: winston.format.combine(winston.format.splat(), winston.format.cli())
});

const logger = winston.createLogger({
  level: config.logger_level,
  transports: [logToFile, logToConsole]
});
exports.logger = logger;

const logDebug = (txt) => { logger.debug(txt) }
const log = (txt) => { logger.info(txt) }
const logError = (txt) => { logger.error(txt) }
exports.logDebug = logDebug;
exports.log = log;
exports.logError = logError;

const on_log = msg => {
  const data = JSON.parse(msg);
  if (data.level == 0) {
    logDebug(`<${data.user_id}> ${data.log} `);
  } else if (data.level == 1) {
    log(`<${data.user_id}> ${data.log} `);
  } else {
    logError(`<${data.user_id}> ${data.log} `);
  }
};
exports.on_log = on_log;

// module.exports = logger;
