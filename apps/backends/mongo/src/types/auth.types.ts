import { SessionDocument } from "./session.types";
import { UserDocument } from "./user.types";

export type RefreshTokenPayload = {
  sessionId: SessionDocument["_id"];
  // Identifies this particular refresh token, so a replayed older one can be told apart.
  jti: string;
};

export type AccessTokenPayload = {
  userId: UserDocument["_id"];
  role : UserDocument["role"];
  sessionId: SessionDocument["_id"];
};
