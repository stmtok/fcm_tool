const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs-extra'); 

admin.initializeApp();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ★追加: 保存用ディレクトリ
const DATA_DIR = path.join(__dirname, '../saved_data');
// ディレクトリが存在しない場合は作成
fs.ensureDirSync(DATA_DIR);

// ヘルパー関数: ファイルパスを取得
const getFilePath = (name) => path.join(DATA_DIR, `${name}.json`);

/**
 * FCMメッセージ送信APIエンドポイント (既存のまま)
 */
app.post('/send', async (req, res) => {
    const { tokens, payload } = req.body;

    if (!tokens || tokens.length === 0 || !payload) {
        return res.status(400).json({ error: 'デバイスのトークン配列またはペイロードが不足しています。' });
    }

    const message = {
        tokens: tokens,
        ...payload
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        // ... (既存の送信ロジック) ...

        console.log(`[${new Date().toLocaleTimeString()}] Multicast sent to ${tokens.length} tokens.`);
        console.log(`Success: ${response.successCount}, Failure: ${response.failureCount}`);

        const failedTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, index) => {
                if (!resp.success) {
                    failedTokens.push({
                        token: tokens[index],
                        error: resp.error.code
                    });
                }
            });
        }

        res.status(200).json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors: failedTokens
        });

    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error sending multicast message:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// ------------------------------------
// ★追加: 保存・読み出し用エンドポイント
// ------------------------------------

/**
 * 保存API
 * リクエストボディ: { name: '保存名', tokens: ['...'], payload: {...} }
 */
app.post('/save', async (req, res) => {
    const { name, tokens, payload } = req.body;

    if (!name || !tokens || !payload) {
        return res.status(400).json({ error: '保存名、トークン、ペイロードのいずれかが不足しています。' });
    }

    const dataToSave = { tokens, payload };
    const filePath = getFilePath(name);

    try {
        await fs.writeJson(filePath, dataToSave, { spaces: 2 });
        res.status(200).json({ success: true, message: `"${name}"としてデータを保存しました。` });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ success: false, error: 'データの保存中にエラーが発生しました。' });
    }
});

/**
 * 読み出しAPI
 * クエリパラメータ: ?name=保存名
 */
app.get('/load', async (req, res) => {
    const name = req.query.name;

    if (!name) {
        return res.status(400).json({ error: '保存名が指定されていません。' });
    }

    const filePath = getFilePath(name);

    try {
        if (!await fs.exists(filePath)) {
            return res.status(404).json({ error: `保存名"${name}"のファイルが見つかりません。` });
        }

        const loadedData = await fs.readJson(filePath);
        res.status(200).json({ success: true, data: loadedData });
    } catch (error) {
        console.error('Load error:', error);
        res.status(500).json({ success: false, error: 'データの読み出し中にエラーが発生しました。' });
    }
});

/**
 * 保存済みリスト取得API
 */
app.get('/list', async (req, res) => {
    try {
        const files = await fs.readdir(DATA_DIR);
        // .json 拡張子を除いたファイル名をリストとして返す
        const savedNames = files.filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json'));
        res.status(200).json({ success: true, names: savedNames });
    } catch (error) {
        console.error('List error:', error);
        res.status(500).json({ success: false, error: '保存済みリストの取得中にエラーが発生しました。' });
    }
});


app.listen(port, () => {
    console.log(`🚀 FCM Sender Tool (Multicast & Save/Load) running at http://localhost:${port}`);
    console.log('Ctrl+C でサーバーを停止します。');
});