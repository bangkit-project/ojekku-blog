export const COMMENT_AVATAR_SIZE = 32;

export interface AvatarImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  eager?: boolean;
}

export interface AvatarLoadingAttrs {
  loading: "eager" | "lazy";
  decoding: "sync" | "async";
}

export function getAvatarLoadingAttrs(eager = false): AvatarLoadingAttrs {
  return eager
    ? { loading: "eager", decoding: "sync" }
    : { loading: "lazy", decoding: "async" };
}
