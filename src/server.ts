import type * as Party from "partykit/server"

type Cursor = {
  id: string
  uri: string
  x?: number
  y?: number
  pointer?: "mouse" | "touch"
  lastUpdate?: number
}

type ConnectionWithCursor = Party.Connection & { cursor?: Cursor }

export default class Server implements Party.Server {
  constructor(readonly party: Party.Party) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    let cursors = {}

    for (const ws of this.party.getConnections()) {
      const id = ws.id

      let cursor =
        (ws as ConnectionWithCursor).cursor || ws.deserializeAttachment()

      if (
        id !== conn.id &&
        cursor !== null &&
        cursor.x !== undefined &&
        cursor.y !== undefined
      ) {
        cursors[id] = cursor
      }
    }

    const message = {
      type: "sync",
      cursors,
    }

    // let's send a message to the connection
    conn.send(JSON.stringify(message))
  }

  onMessage(message: string, sender: Party.Connection) {
    const position = JSON.parse(message)

    const cursor = {
      id: sender.id,
      x: position.x,
      y: position.y,
      uri: position.uri,
      pointer: position.pointer,
      lastUpdate: Date.now(),
    }

    this.setCursor(sender as ConnectionWithCursor, cursor)

    const msg =
      position.x && position.y
        ? {
            type: "update",
            ...cursor,
            id: sender.id,
          }
        : {
            type: "remove",
            id: sender.id,
          }

    this.party.broadcast(JSON.stringify(msg), [sender.id])
  }

  getCursor(connection: ConnectionWithCursor) {
    if (!connection.cursor) {
      connection.cursor = connection.deserializeAttachment()
    }

    return connection.cursor
  }

  setCursor(connection: ConnectionWithCursor, cursor: Cursor) {
    const previousCursor = connection.cursor
    connection.cursor = cursor

    if (
      !previousCursor ||
      !previousCursor.lastUpdate ||
      (cursor.lastUpdate && cursor.lastUpdate - previousCursor.lastUpdate > 100)
    ) {
      connection.serializeAttachment({
        ...cursor,
      })
    }
  }

  onClose(connection: Party.Connection<unknown>): void | Promise<void> {
    const message = {
      type: "remove",
      id: connection.id,
    }

    this.party.broadcast(JSON.stringify(message))
  }
}

Server satisfies Party.Worker
