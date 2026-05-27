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
          allergens: '過敏原',
          dietaryMarkers: '飲食標記',
          home: '組織',
          label: '主要導覽',
          language: '語言',
          logout: '登出',
          swaggerDocs: 'Swagger 文件',
          userHome: '首頁',
        },
      },
      auth: {
        errors: {
          apiUnreachable: '無法連線到 API server。',
          invalidCredentials: 'Email 或密碼不正確。',
        },
        login: {
          description: '使用超級管理員帳號管理組織、過敏原與飲食標記。',
          email: 'Email',
          eyebrow: '超級管理員',
          formDescription: '使用既有的超級管理員平台帳號。',
          formTitle: '管理員登入',
          password: '密碼',
          submit: '登入',
          submitting: '登入中...',
          title: '登入管理平台',
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
          close: '關閉',
          confirm: '確認',
          delete: '刪除',
          edit: '編輯',
          next: '下一頁',
          previous: '上一頁',
          save: '儲存',
          saveChanges: '儲存變更',
          saving: '儲存中...',
        },
        pagination: {
          summary: '第 {{page}} 頁，共 {{total}} 頁',
        },
        errors: {
          apiInvalidResponse: 'API 回傳了此頁面無法讀取的資料。',
          apiServerUnavailable: '服務暫時無法使用。',
          checkApiServer: '請確認 API server 正在執行，然後再試一次。',
          tryAgainLater: '請稍後再試。',
        },
        table: {
          actions: '操作',
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
        goToHome: '前往首頁',
        goToOrganizations: '前往組織',
        signIn: '登入',
        description: '此路由不存在，或頁面可能已移動。',
        eyebrow: '404',
        title: '找不到頁面',
      },
      admin: {
        eyebrow: '超級管理員',
      },
    },
  },
};

export const resources: Resource = mergeResources(
  generatedResources,
  manualResources,
);
