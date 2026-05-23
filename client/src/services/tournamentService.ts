import type {
  CreateTournamentRequest,
  EditTournamentRequest,
  ErrorMsg,
  TournamentInfo,
  TournamentListFilter,
  TournamentListItem,
  UserAuth,
} from "@gamenite/shared";
import { api, exceptionToErrorMsg } from "./api.ts";
import type { APIResponse } from "../util/types.ts";

const TOURNAMENT_API_URL = "/api/tournament";

/**
 * Sends a request to create a new tournament.
 */
export const createTournament = async (
  auth: UserAuth,
  payload: CreateTournamentRequest,
): APIResponse<TournamentInfo> => {
  try {
    if (payload.startTime < new Date()) {
      return { error: "Start time has already passed." };
    }

    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/create`, {
      auth,
      payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Retrieves a populated tournament by id.
 */
export const getTournamentById = async (id: string): APIResponse<TournamentInfo> => {
  try {
    const res = await api.get<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}`);
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Retrieves the tournament list, optionally filtered by host or status.
 */
export const tournamentList = async (
  filter?: TournamentListFilter,
): APIResponse<TournamentListItem[]> => {
  try {
    const res = await api.get<TournamentListItem[] | ErrorMsg>(`${TOURNAMENT_API_URL}/list`, {
      params: filter,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request to edit an existing tournament.
 */
export const editTournament = async (
  auth: UserAuth,
  id: string,
  payload: EditTournamentRequest,
): APIResponse<TournamentInfo> => {
  try {
    if (payload.startTime && payload.startTime < new Date()) {
      return { error: "Start time has already passed." };
    }

    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/edit`, {
      auth,
      payload,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request for the current user to join a tournament.
 */
export const joinTournament = async (auth: UserAuth, id: string): APIResponse<TournamentInfo> => {
  try {
    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/join`, {
      auth,
      payload: null,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request for the current user to leave a tournament.
 */
export const leaveTournament = async (auth: UserAuth, id: string): APIResponse<TournamentInfo> => {
  try {
    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/leave`, {
      auth,
      payload: null,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request to cancel a tournament.
 */
export const cancelTournament = async (auth: UserAuth, id: string): APIResponse<TournamentInfo> => {
  try {
    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/cancel`, {
      auth,
      payload: null,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request to start a tournament immediately.
 */
export const startTournament = async (auth: UserAuth, id: string): APIResponse<TournamentInfo> => {
  try {
    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/start`, {
      auth,
      payload: null,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};

/**
 * Sends a request for the host to remove a participant from a tournament.
 */
export const kickPlayer = async (
  auth: UserAuth,
  id: string,
  targetPlayerId: string,
): APIResponse<TournamentInfo> => {
  try {
    const res = await api.post<TournamentInfo | ErrorMsg>(`${TOURNAMENT_API_URL}/${id}/kick`, {
      auth,
      payload: targetPlayerId,
    });
    return res.data;
  } catch (error) {
    return exceptionToErrorMsg(error);
  }
};
