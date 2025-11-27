# 🚀 Firebase FCM テスト送信ツールキット (GUI & CLI)

本プロジェクトは、Firebase Cloud Messaging (FCM) のプッシュ通知をテスト・デバッグするための **GUI (Web画面)** と **CLI (コマンドライン)** の2つのツールを提供する統合キットです。

Firebase Admin SDK を利用し、安全かつ柔軟な送信テストを可能にします。

## 🛠️ 共通のセットアップと認証情報

両ツールとも同じ Node.js サーバー環境と Firebase 認証情報を共有します。

### 依存パッケージのインストール

プロジェクトルートディレクトリで、必要なパッケージをインストールします。

```bash
npm install express firebase-admin fs-extra
```

### サービスアカウントキーの取得と認証（必須）

両ツールは Firebase Admin SDK を使用します。認証情報を安全に渡すため、**`GOOGLE_APPLICATION_CREDENTIALS`** 環境変数を使用してください。

1.  **JSONファイルの取得**: Firebase Console の「プロジェクトの設定」→「サービスアカウント」から秘密鍵のJSONファイルをダウンロードします。
2.  **環境変数の設定**: サーバーやCLIを実行する前に、ダウンロードしたJSONファイルへのパスを環境変数に設定します。

#### 🔹 環境変数の設定例

```bash
# Linux/macOS
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
```

-----

## 💻 I. Web GUI ツール (ローカルサーバー)

本ツールは、Web画面から視覚的にデバイストークンとペイロードを入力し、FCMを送信できるテスト用のWebアプリケーションです。

### 💡 特徴

  * **視覚的な入力**: デバイストークンとペイロード（JSON）をWeb画面から直接入力。
  * **JSON整形機能**: 入力時の不正なカンマ（Trailing Comma）を自動修正し、整形されたJSONを出力。
  * **テンプレート保存機能**: 入力内容をローカルファイル（`saved_data`フォルダ）にテンプレートとして永続化。

### 📂 配置場所

このツールは、サーバーのサブディレクトリに配置されています。

```
fcm-sender-tool/
├── server.js
└── public/
    ├── index.html
    └── script.js
```

### ⚙️ 使用方法

1.  プロジェクトルートディレクトリでサーバーを起動します。

    ```bash
    node server.js
    ```

2.  ブラウザで **`http://localhost:3000`** にアクセスします。

3.  画面の案内に従って、**デバイス トークン（改行区切り）とペイロード（JSON）を入力し、`送信`** ボタンでテストします。

-----

## ⚡ II. CLI ツール (コマンドライン)

`send-fcm-hybrid.js` スクリプトを使用し、コマンドラインからデバイストークンとペイロードをファイルまたは文字列で指定して送信します。

### 💡 特徴

  * **ハイブリッド入力**: デバイストークンとペイロードを**ファイル**または**コマンドライン文字列**で指定可能。
  * **マルチキャスト送信**: 複数のデバイストークンへの一斉送信（最大500件）に対応。

### ⚙️ 使用方法

`send-fcm-hybrid.js` スクリプトを実行し、以下のオプションを使用して送信先とペイロードを指定します。

#### 📄 オプション一覧

| オプション | 短縮形 | 入力タイプ | 説明 |
| :--- | :--- | :--- | :--- |
| `--tokens` | `-t` | ファイルパス | **改行区切り**のデバイストークンリストをファイルから読み込みます。 |
| `--payload` | `-p` | ファイルパス | **JSON形式**のペイロードをファイルから読み込みます。 |
| `--tokens-str` | なし | 文字列 | **カンマ区切り**のデバイストークンを直接文字列として指定します。 |
| `--payload-str` | なし | 文字列 | **JSON形式**のペイロードを直接文字列として指定します。 |

#### 🚀 実行例

**例 1: ファイルから読み込む (推奨)**

```bash
node send-fcm-hybrid.js \
  -t ./tokens.txt \
  -p ./payload.json
```

**例 2: 文字列で直接指定する**

```bash
# 注意: JSON文字列はシングルクォートで囲み、内部のクォートはダブルクォートを使用してください。

node send-fcm-hybrid.js \
  --tokens-str "TOKEN_A,TOKEN_B" \
  --payload-str '{"notification": {"title": "Test", "body": "Direct message"}, "data": {"type": "test"}}'
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
    "key1": "value1"
  }
  // android, apns, webpush などのプラットフォーム固有のブロックも指定可能です
}
```

-----

## 🛑 エラー処理

CLI・GUIともに、送信成功数と失敗数を報告します。送信に失敗したトークン（例: `messaging/unregistered`）は無効化されている可能性が高いため、アプリケーションのデータベースから削除することを強く推奨します。