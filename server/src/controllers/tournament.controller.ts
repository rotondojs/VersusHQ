/**
 * REST handlers for tournament creation, editing, joins, and lifecycle actions.
 */
import {
  type TournamentInfo,
  type TournamentListFilter,
  type TournamentListItem,
  withAuth,
  zCreateTournamentRequest,
  zEditTournamentRequest,
  zTournamentListFilter,
} from "@gamenite/shared";
import type { RestAPI, SocketAPI, GameServer } from "../types.ts";
import { checkAuth, enforceAuth } from "../services/auth.service.ts";
import {
  cancelTournament,
  createTournament,
  editTournament,
  getTournamentById,
  getTournamentList,
  joinTournament,
  leaveTournament,
  startTournament,
  TournamentServiceError,
  deleteTournament,
  kickPlayer,
} from "../services/tournament.service.ts";
import { z } from "zod";
import { logSocketError } from "./socket.controller.ts";

/**
 * Maps service-layer tournament errors to HTTP responses.
 */
function sendTournamentError(res: Parameters<RestAPI<TournamentInfo>>[1], error: unknown): void {
  if (error instanceof TournamentServiceError) {
    res.status(error.status).send({ error: error.message });
    return;
  }

  throw error;
}

/**
 * Broadcasts a tournament update to all connected clients.
 */
export function broadcastTournamentUpdate(io: GameServer, tournament: TournamentInfo) {
  io.emit("tournamentUpdated", tournament);
}

/**
 * Lists tournaments, optionally filtered by the supplied query params.
 */
export const getList: RestAPI<TournamentListItem[]> = async (req, res) => {
  const parsedFilter = zTournamentListFilter.safeParse(req.query);
  const filter: TournamentListFilter = parsedFilter.success ? parsedFilter.data : undefined;
  res.send(await getTournamentList(filter));
};

/**
 * Returns a single populated tournament by id.
 */
export const getById: RestAPI<TournamentInfo, { id: string }> = async (req, res) => {
  const tournament = await getTournamentById(req.params.id);
  if (!tournament) {
    res.status(404).send({ error: "Tournament not found" });
    return;
  }

  res.send(tournament);
};

/**
 * Creates a tournament without broadcasting it, for plain REST use.
 */
export const postCreate: RestAPI<TournamentInfo> = async (req, res) => {
  const body = withAuth(zCreateTournamentRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  try {
    res.send(await createTournament(user, body.data.payload, new Date()));
  } catch (error) {
    sendTournamentError(res, error);
  }
};

/**
 * Creates a REST handler that persists a new tournament and broadcasts the result.
 */
export function makePostCreate(io: GameServer): RestAPI<TournamentInfo> {
  return async (req, res) => {
    const body = withAuth(zCreateTournamentRequest).safeParse(req.body);
    if (!body.success) {
      res.status(400).send({ error: "Poorly-formed request" });
      return;
    }

    const user = await checkAuth(body.data.auth);
    if (!user) {
      res.status(403).send({ error: "Invalid credentials" });
      return;
    }

    try {
      const result = await createTournament(user, body.data.payload, new Date());
      broadcastTournamentUpdate(io, result);
      res.send(result);
    } catch (error) {
      sendTournamentError(res, error);
    }
  };
}

/**
 * Edits a tournament without broadcasting it, for plain REST use.
 */
export const postEdit: RestAPI<TournamentInfo, { id: string }> = async (req, res) => {
  const body = withAuth(zEditTournamentRequest).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  try {
    res.send(await editTournament(req.params.id, user, body.data.payload, new Date()));
  } catch (error) {
    sendTournamentError(res, error);
  }
};

/**
 * Creates a REST handler that edits a tournament and broadcasts the updated record.
 */
export function makePostEdit(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    const body = withAuth(zEditTournamentRequest).safeParse(req.body);
    if (!body.success) {
      res.status(400).send({ error: "Poorly-formed request" });
      return;
    }

    const user = await checkAuth(body.data.auth);
    if (!user) {
      res.status(403).send({ error: "Invalid credentials" });
      return;
    }

    try {
      const result = await editTournament(req.params.id, user, body.data.payload, new Date());
      broadcastTournamentUpdate(io, result);
      res.send(result);
    } catch (error) {
      sendTournamentError(res, error);
    }
  };
}

/**
 * Validates auth for simple tournament actions whose payload is just `null`.
 */
async function withAuthedTournamentAction(
  req: Parameters<RestAPI<TournamentInfo, { id: string }>>[0],
  res: Parameters<RestAPI<TournamentInfo, { id: string }>>[1],
  action: (
    id: string,
    user: NonNullable<Awaited<ReturnType<typeof checkAuth>>>,
  ) => Promise<TournamentInfo>,
) {
  const body = withAuth(z.null()).safeParse(req.body);
  if (!body.success) {
    res.status(400).send({ error: "Poorly-formed request" });
    return;
  }

  const user = await checkAuth(body.data.auth);
  if (!user) {
    res.status(403).send({ error: "Invalid credentials" });
    return;
  }

  try {
    res.send(await action(req.params.id, user));
  } catch (error) {
    sendTournamentError(res, error);
  }
}

/**
 * Creates a REST handler that adds the current user to a tournament and broadcasts the result.
 */
export function makePostJoin(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    await withAuthedTournamentAction(req, res, async (id, user) => {
      const result = await joinTournament(id, user, new Date());
      broadcastTournamentUpdate(io, result);
      return result;
    });
  };
}

/**
 * Creates a REST handler that removes the current user from a tournament and broadcasts the result.
 */
export function makePostLeave(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    await withAuthedTournamentAction(req, res, async (id, user) => {
      const result = await leaveTournament(id, user, new Date());
      broadcastTournamentUpdate(io, result);
      return result;
    });
  };
}

/**
 * Creates a REST handler that cancels a tournament and broadcasts the result.
 */
export function makePostCancel(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    await withAuthedTournamentAction(req, res, async (id, user) => {
      const result = await cancelTournament(id, user, new Date());
      broadcastTournamentUpdate(io, result);
      return result;
    });
  };
}

/**
 * Creates a REST handler that starts a tournament and broadcasts the updated bracket state.
 */
export function makePostStart(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    await withAuthedTournamentAction(req, res, async (id, user) => {
      const result = await startTournament(id, user, new Date());
      broadcastTournamentUpdate(io, result);
      return result;
    });
  };
}

/**
 * Deletes a tournament without broadcasting it, for plain REST use.
 */
export const deleteById: RestAPI<TournamentInfo, { id: string }> = async (req, res) => {
  await withAuthedTournamentAction(req, res, (id, user) => deleteTournament(id, user, new Date()));
};

/**
 * Creates a REST handler that kicks a participant from a tournament and broadcasts the result.
 */
export function makePostKick(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    const body = withAuth(z.string()).safeParse(req.body);

    if (!body.success) {
      res.status(400).send({ error: "Invalid request format" });
      return;
    }

    const user = await checkAuth(body.data.auth);
    if (!user) {
      res.status(403).send({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await kickPlayer(req.params.id, user, body.data.payload, new Date());

      broadcastTournamentUpdate(io, result);

      res.send(result);
    } catch (error) {
      sendTournamentError(res, error);
    }
  };
}

/**
 * Creates a REST handler that deletes a tournament and broadcasts its removal state.
 */
export function makeDeleteById(io: GameServer): RestAPI<TournamentInfo, { id: string }> {
  return async (req, res) => {
    await withAuthedTournamentAction(req, res, async (id, user) => {
      const result = await deleteTournament(id, user, new Date());
      broadcastTournamentUpdate(io, result);
      return result;
    });
  };
}

/**
 * Subscribes a socket to tournament updates and sends the current tournament snapshot.
 */
export const socketWatch: SocketAPI = (socket) => async (body) => {
  try {
    const { auth, payload: tournamentId } = withAuth(z.string()).parse(body);
    await enforceAuth(auth);
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    await socket.join(tournamentId);
    socket.emit("tournamentWatched", tournament);
  } catch (err) {
    logSocketError(socket, err);
  }
};

/**
 * Removes a socket from a tournament's live-update room.
 */
export const socketUnwatch: SocketAPI = (socket) => async (body) => {
  try {
    const { payload: tournamentId } = withAuth(z.string()).parse(body);
    await socket.leave(tournamentId);
  } catch (err) {
    logSocketError(socket, err);
  }
};
