// const express = require("express");
// const bodyParser = require("body-parser");
// const cors = require("cors");
const fs = require("fs");
const { get_login_id_by_user_id } = require("../config");
const { getUserHash } = require("../tracks");

// const app = express()
// app.use(bodyParser.json())
// app.use(cors())

// const https = require("https");
// const options = {
//   key: fs.readFileSync("./cert/server.key"),
//   cert: fs.readFileSync("./cert/server.crt")
// }

// const https_server = new https.createServer(options, app);

// app.use(express.static("./dist"));
// app.get("/", (req, res) => {
//   res.send("HELLO");
// });

// 鍵ファイルを読む。以降、登録イベント毎に書き込みが発生するが、ファイルから読むのは起動時の1回のみ。
// 処理としては、keyJsonオブジェクトへアクセスするのみで対応
const keyJsonFile = "./server/auth/keys.json";
const updateKeyJson = () => {
  if (fs.existsSync(keyJsonFile)) {
    return JSON.parse(fs.readFileSync(keyJsonFile))
  }
}
const keyJson = updateKeyJson();

const crypto = require("crypto");
// app.get("/req_login", (req, res) => {
exports.req_login = (req, res) => {
  const msg = crypto.randomBytes(10).toString("hex");
  console.log(msg);
  res.send({
    challenge: msg
  })
};

const { subtle } = require('crypto').webcrypto;

const sign = async (key, data) => {
  const ec = new TextEncoder();
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', key, ec.encode(data));
  return signature;
}

const verify = async (key, signature, data) => {
  const ec = new TextEncoder();
  const verified = await subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    ec.encode(data));
  return verified;
}

// app.post("/req_auth", async (req, res) => {
exports.req_auth = async (req, res) => {
  console.log("----------/req_auth----------");
  // console.log(req);
  // console.log(req.body);
  console.log(keyJson);
  const publicKey = keyJson[req.body.id] ? keyJson[req.body.id].publicKey : null;
  console.log(`publicKey = ${publicKey}`);

  // console.log(userHash);
  // ログイン済みかの確認
  const login_users = Object.keys(getUserHash());
  const user_id = get_login_id_by_user_id()[req.body.id];
  const already_logined = login_users.includes(user_id);

  if (!publicKey) {
    res.send({
      message: "ご要望の鍵が見つかりません。"
    });
  } else {
    const signature = req.body.sign;
    const pubKeyObj= await importKey(publicKey);
    console.log(`署名＝${signature}`);
    const buf = Buffer.from(signature, "base64")
    const result_verify = await verify(pubKeyObj, buf, req.body.challenge);
    console.log(`その結果＝${result_verify}`)

    if(result_verify && !already_logined){
      res.send({
        message: "おめでとうございます。署名が検証出来ました。",
        path: keyJson[req.body.id].path
      })
    }else{
      res.send({
        message: "認証エラー"
      })
    }
  }
};

// app.post("/regist", async (req, res) => {
exports.regist = async (req, res) => {
  console.log(req.body);
  const id = req.body.id;
  const password = req.body.password;
  const publicKey = req.body.publicKey;

  // const self_hash = await msg_hash256(`${id}.${password}.${publicKey}`);
  const pubKeyObj= await importKey(publicKey);
  const buf = Buffer.from(req.body.sign, "base64")
  const self_hash_valid = await verify(pubKeyObj, buf, `${id}.${password}.${publicKey}`);
  console.log(`recv_hash=${req.body.sign}`)
  // console.log(`self_hash=${self_hash}`);

  const ids = Object.keys(keyJson);
  const password_in_keyJson = keyJson[id] ? keyJson[id].password : null;

  // 前提としてKeyJsonにIDある事、且つkeyJsonの当該IDのpasswordと一致する事
  // if(req.body.sign == self_hash && ids.includes(id) && password == password_in_keyJson){
  if(self_hash_valid && ids.includes(id) && password == password_in_keyJson){
      console.log(publicKey);
    keyJson[id].publicKey = publicKey;
    console.log(keyJson);
    try {
      fs.writeFileSync(keyJsonFile, JSON.stringify(keyJson, null, 2));
      res.send({
        message: `${id}さんから、イイものを頂きました。折角なので保存しておきました。`
      });
    } catch(err) {
      console.log(err);
      res.send({
        message: "イイものを頂きました。でも、保存出来ませんでした。"
      });
    }
  }else{
    res.send({
      message: "認証エラー"
    })
  }
};

const msg_hash256 = async (msg) => {
  const hashBuffer = await crypto.webcrypto.subtle.digest("SHA-256", new Uint8Array((new TextEncoder()).encode(msg)));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const importKey = async (pem) => {
  console.log(`${pem} / LEN=${pem.length}`);

  const pemHeader = "-----BEGIN PUBLIC KEY-----\n";
  const pemFooter = "\n-----END PUBLIC KEY-----";
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);
  // console.log(pemContents);
  const buf = Buffer.from(pemContents, "base64");
  const key = await subtle.importKey(
    "spki",
    buf, 
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    }, 
    true,
    ['verify']
  );
  return key;
}

// const PORT = process.env.PORT || 443;
// https_server.listen(PORT, () => {
//   console.log(`SERVER START: ${PORT}`);
// })