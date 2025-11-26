# 🚀 Firebase FCM CLI Tool (Node.js)

特定のデバイストークンやトークンリストに対し、Firebase Admin SDK を使用してプッシュ通知をコマンドラインから送信するためのツールです。ファイルからの読み込みと、直接文字列での指定の両方に対応しています。

-----

## 💡 特徴

  * **ハイブリッド入力:** デバイストークンとペイロードを**ファイル**または**コマンドライン文字列**で指定可能。
  * **マルチキャスト送信:** 複数のデバイストークンへの一斉送信（最大500件）に対応。
  * **Admin SDK認証:** サービスアカウントキーを利用し、`gcloud` CLIへの依存なしに安全に認証。

-----

## 🛠️ 事前準備

### 依存パッケージのインストール

Node.js 環境が必要です。

```bash
npm install firebase-admin
```

### サービスアカウントキーの取得

Firebase コンソールからプロジェクトの**サービスアカウント秘密鍵**（JSONファイル）をダウンロードし、環境変数`GOOGLE_APPLICATION_CREDENTIALS`に登録してください。

-----

## ⚙️ 使用方法

`send-fcm.js` スクリプトを実行し、以下のオプションを使用して送信先とペイロードを指定します。

### 📄 オプション一覧

| オプション | 短縮形 | 入力タイプ | 説明 |
| :--- | :--- | :--- | :--- |
| `--tokens` | `-t` | ファイルパス | **改行区切り**のデバイストークンリストをファイルから読み込みます。 |
| `--payload` | `-p` | ファイルパス | **JSON形式**のペイロードをファイルから読み込みます。 |
| `--tokens-str` | なし | 文字列 | **カンマ区切り**のデバイストークンを直接文字列として指定します。 |
| `--payload-str` | なし | 文字列 | **JSON形式**のペイロードを直接文字列として指定します。 |

### 🚀 実行例

#### 例 1: ファイルから読み込む (推奨)

大量のトークンリストや複雑なペイロードに適しています。

```bash
# tokens.txt: トークンを一行ずつ記述
# payload.json: 通知のJSONボディを記述

node send-fcm-hybrid.js \
  -t ./tokens.txt \
  -p ./payload.json
```

#### 例 2: 文字列で直接指定する

シンプルな通知や少数のトークンへのテスト送信に適しています。

```bash
# 注意: JSON文字列はシングルクォートで囲み、内部のクォートはダブルクォートを使用してください。

node send-fcm-hybrid.js \
  --tokens-str "TOKEN_A,TOKEN_B" \
  --payload-str '{"notification": {"title": "Test", "body": "Direct message"}, "data": {"type": "test"}}'
```

#### 例 3: トークンはファイルから、ペイロードは文字列で指定する (ハイブリッド)

```bash
node send-fcm-hybrid.js \
  --tokens ./user_group.txt \
  --payload-str '{"data": {"priority": "high"}}'
```

### 📝 ペイロードの構造

`--payload` や `--payload-str` で指定するJSONは、FCM HTTP v1 APIのメッセージボディ（`message`オブジェクトの中身）に相当します。

```json
{
  "notification": {
    "title": "通知タイトル",
    "body": "通知本文"
  },
  "data": {
    "key1": "value1",
    "key2": "value2"
  },
  "android": {
    "priority": "high"
  }
}
```

-----

## 🛑 エラー処理

スクリプトは送信成功数と失敗数を報告します。失敗したトークンが検出された場合（例: `messaging/unregistered`）、そのトークンは無効化されているため、アプリケーションのデータベースから削除することを強く推奨します。