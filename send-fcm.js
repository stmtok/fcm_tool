const admin = require('firebase-admin');
const fs = require('fs');

/**
 * コマンドライン引数をパースし、オプションと値のオブジェクトを生成する
 */
const parseArgs = (args) => {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--tokens' || arg === '-t') {
            if (args[i + 1]) options.tokens = args[i + 1];
            i++;
        } else if (arg === '--payload' || arg === '-p') {
            if (args[i + 1]) options.payload = args[i + 1];
            i++;
        } else if (arg === '--tokens-str') {
            if (args[i + 1]) options.tokensStr = args[i + 1];
            i++;
        } else if (arg === '--payload-str') {
            if (args[i + 1]) options.payloadStr = args[i + 1];
            i++;
        } else if (arg === '--dry-run') { // ★ dry-runオプションの追加
            options.dryRun = true;
        }
    }
    return options;
};

const options = parseArgs(process.argv.slice(2));

// 必須オプションのチェック
if ((!options.tokens && !options.tokensStr) || (!options.payload && !options.payloadStr)) {
    console.error('エラー: 送信先トークンとペイロードを指定してください。');
    console.log('\n使用方法例: node send-fcm-final.js -t tokens.txt -p payload.json [--dry-run]');
    process.exit(1);
}

const isDryRun = options.dryRun || false;


// -----------------------------------------------------------------------------------
// 1. Admin SDKの初期化 (ADCを使用)
// -----------------------------------------------------------------------------------
if (isDryRun) {
    console.log('✅ dry-runモードが有効です。通知は送信されません。');
}

console.log('Firebase Admin SDK version:', admin.SDK_VERSION); // バージョンを確認
try {
    admin.initializeApp();
    console.log('✅ Firebase Admin SDKを環境変数認証で初期化しました。');
} catch (e) {
    console.error('\n❌ エラー: Admin SDKの初期化に失敗しました。GOOGLE_APPLICATION_CREDENTIALS環境変数が設定されているか確認してください。');
    console.error('詳細:', e.message);
    process.exit(1);
}

// -----------------------------------------------------------------------------------
// 2. トークンデータの取得 (ファイルまたは文字列)
// -----------------------------------------------------------------------------------
let targetTokens = [];
// ... (トークン読み込みロジックは省略 - 前バージョンと同じ) ...
if (options.tokens) {
    try {
        const tokenFileContent = fs.readFileSync(options.tokens, 'utf8');
        targetTokens = tokenFileContent.split(/\r?\n/).map(token => token.trim()).filter(token => token.length > 0);
        console.log(`✅ トークンをファイル (${options.tokens}) から ${targetTokens.length} 件読み込みました。`);
    } catch (e) {
        console.error(`\nエラー: トークンファイル (${options.tokens}) の読み込みまたは解析に失敗しました。`);
        process.exit(1);
    }
} else if (options.tokensStr) {
    targetTokens = options.tokensStr.split(',').map(token => token.trim()).filter(token => token.length > 0);
    console.log(`✅ トークンを文字列から ${targetTokens.length} 件読み込みました。`);
}

if (targetTokens.length === 0) {
    console.error('\nエラー: 有効なデバイストークンが見つかりませんでした。');
    process.exit(1);
}

// -----------------------------------------------------------------------------------
// 3. ペイロードデータの取得 (ファイルまたは文字列)
// -----------------------------------------------------------------------------------
let multicastPayload;
// ... (ペイロード読み込みロジックは省略 - 前バージョンと同じ) ...
if (options.payload) {
    try {
        const payloadFileContent = fs.readFileSync(options.payload, 'utf8');
        multicastPayload = JSON.parse(payloadFileContent);
        console.log(`✅ ペイロードをファイル (${options.payload}) から読み込みました。`);
    } catch (e) {
        console.error(`\nエラー: ペイロードファイル (${options.payload}) の読み込みまたはJSON解析に失敗しました。`);
        process.exit(1);
    }
} else if (options.payloadStr) {
    try {
        multicastPayload = JSON.parse(options.payloadStr);
        console.log('✅ ペイロードを文字列からパースしました。');
    } catch (e) {
        console.error('\nエラー: ペイロード文字列のJSON解析に失敗しました。JSON形式が正しいか確認してください。');
        process.error(e.message);
        process.exit(1);
    }
}


// -----------------------------------------------------------------------------------
// 4. FCMマルチキャスト送信
// -----------------------------------------------------------------------------------
console.log('\n--- 送信内容の確認 ---');
console.log(`宛先トークン数: ${targetTokens.length} 件`);

// 通常実行 (dry-runではない場合)
const message = {
    ...multicastPayload,
    tokens: targetTokens,
};

if (isDryRun) {
    console.log('\n🛑 dry-runモードのため、FCM送信APIの呼び出しをスキップしました。');
    console.log('認証、データの読み込み、ペイロードのパースは正常に完了しました。');
    console.log('ペイロード:', JSON.stringify(message));
    process.exit(0);
}

console.log('\n🚀 FCM送信APIを呼び出します...');
admin.messaging().sendEachForMulticast(message)
    .then((response) => {
        response.responses.forEach((r) => console.log(`${r.success}: ${r.error}\n`));
        console.log(`\n🎉 送信完了: 成功 ${response.successCount} 件, 失敗 ${response.failureCount} 件`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ 送信失敗エラー:', error);
        process.exit(1);
    });