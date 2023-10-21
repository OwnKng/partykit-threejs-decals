import type * as Party from "partykit/server"

type Cursor = {
  id: string
  uri?: string
  start: [number, number, number]
  end: [number, number, number]
  lastUpdate?: number
}

type ConnectionWithCursor = Party.Connection & { cursor?: Cursor }

const Server = {
  onConnect(conn: Party.Connection, room: Party.ConnectionContext) {
    let cursors = {}

    for (const ws of room.getConnections()) {
      const id = ws.id

      let cursor =
        (conn as ConnectionWithCursor).cursor || conn.deserializeAttachment()

      if (
        id !== conn.id &&
        cursor !== null &&
        cursor.start !== undefined &&
        cursor.end !== undefined
      ) {
        cursors[id] = cursor
      }
    }

    const message = {
      type: "sync",
      cursors,
    }

    conn.send(JSON.stringify(message))
  },
  onMessage(message, websocket, room) {
    const passed = JSON.parse(message) as Cursor

    const { uri, start, end } = passed

    const updated = {
      id: websocket.id,
      uri,
      start,
      end,
      lastUpdate: Date.now(),
    }

    websocket.serializeAttachment({
      ...updated,
    })

    const msg =
      start !== undefined && end !== undefined
        ? {
            type: "update",
            ...updated,
          }
        : {
            type: "remove",
            ...updated,
          }

    room.broadcast(JSON.stringify(msg), [websocket.id])
  },
  onClose(connection: Party.Connection<unknown>, room): void | Promise<void> {
    const message = {
      type: "remove",
      id: connection.id,
    }

    room.broadcast(JSON.stringify(message))
  },
}

export default Server
