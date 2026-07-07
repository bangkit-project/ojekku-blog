let pendingTelegramUrl = "";
let dialogEl: HTMLDialogElement | null = null;

export function resolveTelegramUrlFromTrigger(trigger: HTMLElement): string | null {
  const container = trigger.closest<HTMLElement>("[data-telegram-url]");
  const url = container?.dataset.telegramUrl?.trim();
  return url || null;
}

export function initTelegramJoinDialog(root: HTMLElement): void {
  const dialog = root.querySelector<HTMLDialogElement>("[data-telegram-join-dialog]");
  if (!dialog || dialog.dataset.telegramJoinBound === "true") return;

  dialog.dataset.telegramJoinBound = "true";
  dialogEl = dialog;

  const ok = root.querySelector<HTMLButtonElement>("[data-telegram-join-ok]");
  const cancel = root.querySelector<HTMLButtonElement>("[data-telegram-join-cancel]");

  cancel?.addEventListener("click", () => {
    dialog.close();
  });

  ok?.addEventListener("click", () => {
    if (pendingTelegramUrl) {
      window.open(pendingTelegramUrl, "_blank", "noopener,noreferrer");
    }
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

export function openTelegramJoinDialog(telegramUrl: string): void {
  const url = telegramUrl.trim();
  if (!url || !dialogEl) return;
  pendingTelegramUrl = url;
  dialogEl.showModal();
}

export function initTelegramJoinTriggers(): void {
  if (window.__ojekkuTelegramJoinInit) return;
  window.__ojekkuTelegramJoinInit = true;

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const trigger = target.closest<HTMLElement>("[data-telegram-join-trigger]");
    if (!trigger) return;

    const url = resolveTelegramUrlFromTrigger(trigger);
    if (!url) return;

    event.preventDefault();
    openTelegramJoinDialog(url);
  });
}

export function initAllTelegramJoinDialogs(): void {
  document
    .querySelectorAll<HTMLElement>("[data-telegram-join-dialog-root]")
    .forEach(initTelegramJoinDialog);
}
