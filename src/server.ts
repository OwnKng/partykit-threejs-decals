import type * as Party from "partykit/server"

type Sticker = {
  createdBy: string
  position: [number, number, number]
  rotation: [number, number, number]
  sticker: string
}

type ConnectionWithSticker = Party.Connection & { sticker?: Sticker }

const Server = {
  onConnect(conn: Party.Connection, room: Party.ConnectionContext) {
    let stickers = {}

    for (const ws of room.getConnections()) {
      const id = ws.id

      let sticker =
        (conn as ConnectionWithSticker).sticker || conn.deserializeAttachment()

      if (
        id !== conn.id &&
        sticker !== null &&
        sticker.position !== undefined &&
        sticker.rotation !== undefined
      ) {
        stickers[id] = sticker
      }

      conn.send(JSON.stringify({ type: "sync", stickers }))
    }
  },
  onMessage(message, websocket, room) {
    const passed = JSON.parse(message) as Sticker

    websocket.serializeAttachment({
      id: websocket.id,
      lastUpdate: Date.now(),
      ...passed,
    })

    const msg =
      passed.position !== undefined &&
      passed.rotation !== undefined &&
      passed.sticker !== undefined
        ? {
            type: "update",
            id: room.id,
            ...passed,
          }
        : {
            type: "remove",
            id: room.id,
          }

    room.broadcast(JSON.stringify(msg))
  },
  onClose(connection: Party.Connection, room: Party.ConnectionContext) {
    room.broadcast(JSON.stringify({ type: "remove", id: connection.id }))
  },
}

export default Server
