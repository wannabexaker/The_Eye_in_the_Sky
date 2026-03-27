export type CurrentAuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "player" | "admin";
  sessionId: string;
};

export type RequestWithAuth = {
  headers?: Record<string, string | string[] | undefined>;
  authUser?: CurrentAuthUser;
  ip?: string;
  socket?: { remoteAddress?: string };
  secure?: boolean;
};
