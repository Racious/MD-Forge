// 極簡全域 toast：複製等動作的即時反饋。單例 reactive，全站共用。
import { ref } from 'vue';

const message = ref('');
let timer: number | undefined;

export function useToast() {
  function show(msg: string, ms = 1500): void {
    message.value = msg;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => (message.value = ''), ms);
  }
  return { message, show };
}

/** 複製文字並彈出反饋。
 *  防呆：navigator.clipboard 在某些 WebView 下可能拋錯，甚至 promise 永不結算而卡住，
 *  導致 toast 永遠不跳。故加逾時保護 + execCommand 後備，且無論成敗都給反饋。 */
export async function copyWithToast(text: string, label: string): Promise<void> {
  const { show } = useToast();
  let ok = false;

  if (navigator.clipboard?.writeText) {
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('clipboard timeout')), 600),
        ),
      ]);
      ok = true;
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    // 後備：clipboard API 不可用或卡住時，用隱藏 textarea + execCommand。
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      ok = false;
    }
  }

  show(ok ? label : '複製失敗');
}
