import type { Resource } from 'i18next';
import { generatedResources } from './resources.generated';

type ResourceBranch = string | { [key: string]: ResourceBranch };

function mergeResourceBranch(
  base: ResourceBranch,
  override: ResourceBranch,
): ResourceBranch {
  if (typeof base === 'string' || typeof override === 'string') {
    return override;
  }

  const merged: { [key: string]: ResourceBranch } = { ...base };

  for (const [key, value] of Object.entries(override)) {
    merged[key] =
      key in merged ? mergeResourceBranch(merged[key], value) : value;
  }

  return merged;
}

function mergeResources(base: Resource, override: Resource): Resource {
  return mergeResourceBranch(
    base as ResourceBranch,
    override as ResourceBranch,
  ) as Resource;
}

const manualResources: Resource = {
  'zh-TW': {
    translation: {
      app: {
        errorBoundary: {
          description: '頁面停止渲染。請再試一次，或回到首頁。',
          home: '首頁',
          title: '發生錯誤',
          tryAgain: '再試一次',
        },
        feedback: {
          dismissNotification: '關閉通知',
        },
        loading: {
          checkingSession: '正在檢查登入狀態',
        },
        navigation: {
          apiHealth: 'API 健康狀態',
          home: 'Todos',
          label: '主要導覽',
          language: '語言',
          logout: '登出',
          swaggerDocs: 'Swagger 文件',
        },
      },
      auth: {
        errors: {
          accountExists: '此 Email 已有帳號。',
          apiUnreachable: '無法連線到 API server。',
          emailRegistered: '此 Email 已被註冊。',
          invalidCredentials: 'Email 或密碼不正確。',
          registerFailed: '無法建立此帳號。',
        },
        login: {
          createAccount: '建立帳號',
          description:
            '前端將 access token 保存在記憶體中，並透過後端 refresh cookie 還原登入狀態。',
          email: 'Email',
          eyebrow: '點餐平台',
          formDescription: '使用既有的平台帳號。',
          formTitle: '登入',
          password: '密碼',
          submit: '登入',
          submitting: '登入中...',
          title: '登入以管理工作區',
        },
        register: {
          backToLogin: '回到登入',
          confirmPassword: '確認密碼',
          description:
            '註冊會回傳 access token，並發出受保護路由使用的 refresh cookie。',
          email: 'Email',
          eyebrow: '點餐平台',
          formDescription: '使用簡單且接近正式環境的密碼規則開始。',
          formTitle: '註冊',
          password: '密碼',
          passwordDescription: '至少 8 個字元，並包含英文大小寫字母和數字。',
          submit: '建立帳號',
          submitting: '建立帳號中...',
          title: '建立帳號',
          username: '使用者名稱',
        },
        validation: {
          confirmPasswordRequired: '請輸入確認密碼。',
          passwordsDoNotMatch: '密碼不一致。',
          submitInvalid: '請檢查標示欄位後再試一次。',
        },
      },
      common: {
        actions: {
          back: '返回',
          cancel: '取消',
          confirm: '確認',
          delete: '刪除',
          saveChanges: '儲存變更',
        },
        errors: {
          apiInvalidResponse: 'API 回傳了此頁面無法讀取的資料。',
          apiServerUnavailable: 'Todo 服務暫時無法使用。',
          checkApiServer: '請確認 API server 正在執行，然後再試一次。',
          tryAgainLater: '請稍後再試。',
        },
        fields: {
          description: '描述',
          owner: '負責人',
          password: '密碼',
          priority: '優先度',
          status: '狀態',
          title: '標題',
        },
      },
      notFound: {
        back: '返回',
        goToTodos: '前往 todos',
        signIn: '登入',
        description: '此路由不存在，或頁面可能已移動。',
        eyebrow: '404',
        title: '找不到頁面',
      },
      todo: {
        create: {
          backToOverview: '回到總覽',
          description: '新增 todo，並設定負責人、優先度與起始狀態。',
          eyebrow: '建立 todo',
          submit: '建立 todo',
          submitError: '無法建立 todo。',
          title: '新增 todo',
        },
        detail: {
          backToOverview: '回到總覽',
          emptyDescription: '沒有描述',
          eyebrow: 'Todo 詳細資料',
          loadError: '載入 todo item 失敗。',
          loading: '正在載入 todo 詳細資料',
          notFoundError: '找不到 todo item。',
          summary: '摘要',
        },
        labels: {
          priority: {
            high: '高優先度',
            low: '低優先度',
            medium: '中優先度',
          },
          status: {
            done: '完成',
            inProgress: '進行中',
            todo: '待辦',
          },
        },
        overview: {
          addTodo: '新增 todo',
          empty: '目前還沒有 todos。新增第一個 item 開始。',
          eyebrow: 'Todo workspace',
          listLabel: 'Todo 清單',
          loadError: '載入 todos 失敗。',
          loading: '正在載入 todos',
          subtitle: '檢視、更新狀態，並開啟每個 todo 的完整編輯流程。',
          title: 'Todos',
        },
        toast: {
          created: {
            message: '新的 todo 已可編輯。',
            title: 'Todo 已建立',
          },
          createFailed: {
            title: '無法建立 todo',
          },
          deleted: {
            message: 'Todo 已移除。',
            title: 'Todo 已刪除',
          },
          deleteFailed: {
            title: '無法刪除 todo',
          },
          loadDetailFailed: {
            title: '無法載入 todo',
          },
          loadOverviewFailed: {
            title: '無法載入 todos',
          },
          notFound: {
            deletedMessage: '此 todo 可能已被刪除。',
            movedMessage: '此 todo 可能已被刪除或移動。',
            title: '找不到 todo',
          },
          saved: {
            message: '變更已儲存。',
            title: 'Todo 已儲存',
          },
          saveFailed: {
            title: '無法儲存 todo',
          },
          updated: {
            message: '狀態已儲存。',
            title: 'Todo 已更新',
          },
          updateFailed: {
            title: '無法更新 todo',
          },
          validationFailed: '請檢查表單後再試一次。',
        },
        validation: {
          ownerRequired: '請輸入負責人。',
          titleRequired: '請輸入標題。',
        },
      },
    },
  },
};

export const resources: Resource = mergeResources(
  generatedResources,
  manualResources,
);
