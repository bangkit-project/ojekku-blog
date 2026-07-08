import { getAvatarLoadingAttrs } from "./avatarImage";

const OBSERVED_ATTRIBUTES = ["src", "alt", "width", "height", "class", "eager"] as const;

export class CommenterAvatarElement extends HTMLElement {
  static get observedAttributes() {
    return OBSERVED_ATTRIBUTES;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.render();
    }
  }

  private render() {
    const src = this.getAttribute("src") ?? "";
    const alt = this.getAttribute("alt") ?? "";
    const width = Number(this.getAttribute("width") ?? 32);
    const height = Number(this.getAttribute("height") ?? 32);
    const className = this.getAttribute("class") ?? "";
    const eager = this.hasAttribute("eager");
    const { loading, decoding } = getAvatarLoadingAttrs(eager);

    let img = this.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      this.replaceChildren(img);
    }

    img.src = src;
    img.alt = alt;
    img.width = width;
    img.height = height;
    img.loading = loading;
    img.decoding = decoding;
    img.className = className;
  }
}

export function registerCommenterAvatarElement(): void {
  if (!customElements.get("commenter-avatar")) {
    customElements.define("commenter-avatar", CommenterAvatarElement);
  }
}
