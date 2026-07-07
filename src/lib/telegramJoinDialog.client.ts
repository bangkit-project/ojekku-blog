let pendingTelegramUrl = "";

const PAGE_SCROLL_LOCK_CLASS = "telegram-join-dialog-open";

function lockPageScroll(): void {
  document.documentElement.classList.add(PAGE_SCROLL_LOCK_CLASS);
}

function unlockPageScroll(): void {
  document.documentElement.classList.remove(PAGE_SCROLL_LOCK_CLASS);
}

export function resolveTelegramUrlFromTrigger(trigger: HTMLElement): string | null {
  const container = trigger.closest<HTMLElement>("[data-telegram-url]");
  const url = container?.dataset.telegramUrl?.trim();
  return url || null;
}

function getLiveTelegramJoinDialog(): HTMLDialogElement | null {
  const dialog = document.querySelector<HTMLDialogElement>("[data-telegram-join-dialog]");
  return dialog?.isConnected ? dialog : null;
}

export function openTelegramJoinDialog(telegramUrl: string): void {
  const url = telegramUrl.trim();
  const dialog = getLiveTelegramJoinDialog();
  if (!url || !dialog) return;
  pendingTelegramUrl = url;
  lockPageScroll();
  dialog.showModal();
}

export function initTelegramJoinTriggers(): void {
  if (window.__ojekkuTelegramJoinInit) return;
  window.__ojekkuTelegramJoinInit = true;

  document.addEventListener(
    "close",
    (event) => {
      const dialog = event.target;
      if (dialog instanceof HTMLDialogElement && dialog.matches("[data-telegram-join-dialog]")) {
        unlockPageScroll();
      }
    },
    true,
  );

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("[data-telegram-join-ok]")) {
      const dialog = getLiveTelegramJoinDialog();
      if (!dialog) return;
      if (pendingTelegramUrl) {
        window.open(pendingTelegramUrl, "_blank", "noopener,noreferrer");
      }
      pendingTelegramUrl = "";
      dialog.close();
      return;
    }

    if (target.closest("[data-telegram-join-cancel]")) {
      pendingTelegramUrl = "";
      getLiveTelegramJoinDialog()?.close();
      return;
    }

    const backdropDialog = target.closest<HTMLDialogElement>("[data-telegram-join-dialog]");
    if (backdropDialog && event.target === backdropDialog) {
      pendingTelegramUrl = "";
      backdropDialog.close();
      return;
    }

    const trigger = target.closest<HTMLElement>("[data-telegram-join-trigger]");
    if (!trigger) return;

    const url = resolveTelegramUrlFromTrigger(trigger);
    if (!url) return;

    event.preventDefault();
    openTelegramJoinDialog(url);
  });
}
