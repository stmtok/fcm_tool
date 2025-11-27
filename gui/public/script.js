const BACKEND_URL = '/send'; 
const SAVE_URL = '/save';
const LOAD_URL = '/load';
const LIST_URL = '/list';

const statusElement = document.getElementById('status');
const tokensTextarea = document.getElementById('deviceTokens');
const payloadTextarea = document.getElementById('payload');
const saveNameInput = document.getElementById('saveName');
const savedListDiv = document.getElementById('savedList');

function updateStatus(message, isError = false) {
    statusElement.className = isError ? 'status-error' : 'status-success';
    if (!isError) {
        statusElement.className = '';
    }
    statusElement.textContent = message;
}

// JSON整形機能
function formatJson() {
    const payloadTextarea = document.getElementById('payload');
    const statusElement = document.getElementById('status');
    
    // ステータスをリセット
    statusElement.className = ''; 
    
    let jsonString = payloadTextarea.value.trim();

    // -----------------------------------------------------------
    // ★追加ロジック: 不正な末尾のカンマを安全に削除
    // -----------------------------------------------------------
    // 正規表現: 閉じ括弧 '}' または ']' の直前にある任意の空白とカンマを削除
    // 例: {"key": "value", } -> {"key": "value"}
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
    // -----------------------------------------------------------

    try {
        // クリーンアップされた文字列をパース
        const payloadObject = JSON.parse(jsonString);
        
        // JSONをインデントして整形し、textareaに戻す
        payloadTextarea.value = JSON.stringify(payloadObject, null, 2);
        updateStatus('JSONを整形しました。');
    } catch (e) {
        updateStatus('❌ 無効なJSON形式です。', true);
        alert('無効なJSON形式です。'); 
    }
}

// FCM送信処理 (変更なし)
async function sendMessage() {
    const tokensText = tokensTextarea.value.trim();
    const tokens = tokensText.split('\n')
                             .map(t => t.trim())
                             .filter(t => t.length > 0);
                             
    const payloadText = payloadTextarea.value.trim();
    
    updateStatus('', false); // ステータスをリセット

    if (tokens.length === 0 || !payloadText) {
        updateStatus('トークンとペイロードを入力してください。', true);
        return;
    }

    try {
        const payloadObject = JSON.parse(payloadText);
        updateStatus(`送信中... (${tokens.length} 件のトークン宛)`);
        
        const response = await fetch(BACKEND_URL, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokens: tokens,
                payload: payloadObject
            })
        });

        const result = await response.json();

        if (response.ok) {
            let message = `✅ 送信成功: 成功 ${result.successCount} 件 / 失敗 ${result.failureCount} 件`;
            
            if (result.failureCount > 0) {
                 message += `\n (失敗トークンはコンソールを確認してください)`;
                 console.error('送信失敗の詳細:', result.errors);
            }
            updateStatus(message, false);
        } else {
            updateStatus(`❌ 送信失敗: ${result.error}`, true);
            console.error('エラー詳細:', result.error);
        }

    } catch (e) {
        updateStatus('❌ エラーが発生しました (JSON形式を確認してください)。', true);
        console.error(e);
    }
}


// ------------------------------------
// ★追加: 保存・読み出し機能
// ------------------------------------

/**
 * 現在のトークンとペイロードをテンプレートとして保存
 */
async function saveTemplate() {
    const name = saveNameInput.value.trim();
    const tokensText = tokensTextarea.value.trim();
    const payloadText = payloadTextarea.value.trim();

    if (!name) {
        alert('テンプレート名を入力してください。');
        return;
    }

    // トークンとペイロードの整形（JSONチェック）
    try {
        JSON.parse(payloadText);
    } catch (e) {
        alert('ペイロードが有効なJSON形式ではありません。');
        return;
    }

    const tokens = tokensText.split('\n')
                             .map(t => t.trim())
                             .filter(t => t.length > 0);

    if (tokens.length === 0) {
        alert('トークンを入力してください。');
        return;
    }

    updateStatus(`テンプレート"${name}"を保存中...`);
    
    try {
        const response = await fetch(SAVE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, tokens, payload: JSON.parse(payloadText) })
        });
        
        const result = await response.json();

        if (response.ok && result.success) {
            updateStatus(`✅ ${result.message}`);
            loadSavedList(); // 保存後にリストを更新
            saveNameInput.value = ''; // 保存名をクリア
        } else {
            updateStatus(`❌ 保存失敗: ${result.error}`, true);
        }

    } catch (e) {
        updateStatus('❌ テンプレートの保存中にエラーが発生しました。', true);
    }
}

/**
 * テンプレートを読み出し、フォームに反映
 */
async function loadTemplate(name) {
    updateStatus(`テンプレート"${name}"を読み込み中...`);

    try {
        const response = await fetch(`${LOAD_URL}?name=${encodeURIComponent(name)}`);
        const result = await response.json();

        if (response.ok && result.success) {
            const { tokens, payload } = result.data;

            // フォームに反映
            tokensTextarea.value = tokens.join('\n');
            payloadTextarea.value = JSON.stringify(payload, null, 2); // JSON整形して表示
            
            updateStatus(`✅ テンプレート"${name}"を読み込みました。`);
        } else {
            updateStatus(`❌ 読み出し失敗: ${result.error}`, true);
        }
    } catch (e) {
        updateStatus('❌ テンプレートの読み出し中にエラーが発生しました。', true);
    }
}

/**
 * 保存済みテンプレートのリストを取得し、UIを更新
 */
async function loadSavedList() {
    savedListDiv.innerHTML = 'リストを読み込み中...';
    
    try {
        const response = await fetch(LIST_URL);
        const result = await response.json();

        if (response.ok && result.success) {
            if (result.names.length === 0) {
                savedListDiv.textContent = '保存されたテンプレートはありません。';
                return;
            }

            savedListDiv.innerHTML = '';
            result.names.forEach(name => {
                const button = document.createElement('button');
                button.textContent = name;
                button.onclick = () => loadTemplate(name);
                savedListDiv.appendChild(button);
            });

        } else {
            savedListDiv.textContent = '❌ リストの読み込みに失敗しました。';
            console.error('List load error:', result.error);
        }
    } catch (e) {
        savedListDiv.textContent = '❌ リスト取得APIへの接続に失敗しました。';
    }
}