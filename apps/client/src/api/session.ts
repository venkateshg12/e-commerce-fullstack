import API from "@/lib/api";
import type { SessionSummary, SuccessResponse, VerifiedResponse } from "@/types";

// Every session this account currently has open, newest first, with the current one flagged.
export const getSessions = async (): Promise<SuccessResponse<SessionSummary[]>> => {
    const response = await API.get<SuccessResponse<SessionSummary[]>>("/session");
    return response.data;
};

// Signs that device out. The server scopes the delete to the caller's own sessions, and the access
// token dies with it — `authenticate` checks the session on every request.
export const revokeSession = async (sessionId: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.delete<SuccessResponse<VerifiedResponse>>(`/session/${sessionId}`);
    return response.data;
};
