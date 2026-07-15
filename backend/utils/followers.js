const { query, queryOne } = require('../config/db')

// Un mismo seguidor puede tener fila en la tabla por-dispositivo (team_follows /
// tournament_follows / player_follows, usada para push) Y en la tabla por-cuenta
// (user_team_follows / user_tournament_follows / user_player_follows) al mismo
// tiempo — por ejemplo cualquier usuario logueado que además tenga notificaciones
// push activas en ese navegador. Sumar el tamaño de ambas tablas duplicaría a esas
// personas. Para evitarlo, cuando el endpoint del dispositivo tiene un user_id
// conocido, se usa ese user_id como identidad; si no, el endpoint mismo hace de
// identidad. El user_id de un endpoint puede venir de dos fuentes: push_subscriptions
// (solo se llena si el usuario activó notificaciones) o device_accounts (se llena en
// cualquier sync de follows con sesión activa, exista o no push) — device_accounts
// cubre el caso de alguien que siguió algo como anónimo, activó push, y LUEGO inició
// sesión sin volver a tocar el botón de notificaciones (subscribePush() no se
// re-dispara solo por loguearse). CAST(...AS TEXT) en vez de ::text porque ::text
// no lo entiende SQLite (portable entre Postgres y SQLite).
// $1/$2 (o $N/$N+n en las versiones en lote) quedan con el mismo valor duplicado en
// vez de reutilizar el mismo placeholder dos veces: la conversión $N→? para SQLite
// (config/db.js) reemplaza cada aparición por un "?" independiente, así que reusar
// el mismo número deja el statement con más "?" que valores.
// Un error aquí (p.ej. una migración de tabla que aún no corrió) nunca debe
// tumbar la vista completa de un torneo/equipo solo por un contador social —
// se atrapa y se degrada a 0 en vez de dejar que explote hacia arriba.
function followerCountFactory(entityCol, deviceTable, userTable) {
  return async function count(id) {
    try {
      const row = await queryOne(`
        SELECT COUNT(DISTINCT identity) AS c FROM (
          SELECT COALESCE(CAST(da.user_id AS TEXT), CAST(ps.user_id AS TEXT), df.endpoint) AS identity
          FROM ${deviceTable} df
          LEFT JOIN push_subscriptions ps ON ps.endpoint = df.endpoint
          LEFT JOIN device_accounts da ON da.endpoint = df.endpoint
          WHERE df.${entityCol} = $1
          UNION
          SELECT CAST(uf.user_id AS TEXT) AS identity
          FROM ${userTable} uf
          WHERE uf.${entityCol} = $2
        ) x
      `, [id, id])
      return row ? Number(row.c) : 0
    } catch (e) {
      console.error(`[followerCount:${entityCol}]`, e.message)
      return 0
    }
  }
}

function followerCountsFactory(entityCol, deviceTable, userTable) {
  return async function counts(ids) {
    const uniqueIds = [...new Set(ids.filter(id => id != null))]
    if (!uniqueIds.length) return new Map()
    try {
      const n = uniqueIds.length
      const ph1 = uniqueIds.map((_, i) => `$${i + 1}`).join(',')
      const ph2 = uniqueIds.map((_, i) => `$${n + i + 1}`).join(',')
      const rows = (await query(`
        SELECT ${entityCol}, COUNT(DISTINCT identity) AS c FROM (
          SELECT df.${entityCol} AS ${entityCol}, COALESCE(CAST(da.user_id AS TEXT), CAST(ps.user_id AS TEXT), df.endpoint) AS identity
          FROM ${deviceTable} df
          LEFT JOIN push_subscriptions ps ON ps.endpoint = df.endpoint
          LEFT JOIN device_accounts da ON da.endpoint = df.endpoint
          WHERE df.${entityCol} IN (${ph1})
          UNION
          SELECT uf.${entityCol} AS ${entityCol}, CAST(uf.user_id AS TEXT) AS identity
          FROM ${userTable} uf
          WHERE uf.${entityCol} IN (${ph2})
        ) x
        GROUP BY ${entityCol}
      `, [...uniqueIds, ...uniqueIds])).rows
      return new Map(rows.map(r => [Number(r[entityCol]), Number(r.c)]))
    } catch (e) {
      console.error(`[followerCounts:${entityCol}]`, e.message)
      return new Map()
    }
  }
}

// Registra/actualiza el vínculo dispositivo↔cuenta. Se llama desde cualquier
// ruta de follows que reciba a la vez endpoint y sesión activa (sync al arrancar
// la app, o al seguir/dejar de seguir algo estando logueado).
async function linkDeviceAccount(endpoint, userId) {
  if (!endpoint || !userId) return
  await query(`
    INSERT INTO device_accounts (endpoint, user_id) VALUES ($1,$2)
    ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id`, [endpoint, userId])
}

const teamFollowerCount        = followerCountFactory('team_id', 'team_follows', 'user_team_follows')
const tournamentFollowerCount  = followerCountFactory('tournament_id', 'tournament_follows', 'user_tournament_follows')
const playerFollowerCount      = followerCountFactory('player_id', 'player_follows', 'user_player_follows')

const teamFollowerCounts       = followerCountsFactory('team_id', 'team_follows', 'user_team_follows')
const tournamentFollowerCounts = followerCountsFactory('tournament_id', 'tournament_follows', 'user_tournament_follows')
const playerFollowerCounts     = followerCountsFactory('player_id', 'player_follows', 'user_player_follows')

module.exports = {
  teamFollowerCount, tournamentFollowerCount, playerFollowerCount,
  teamFollowerCounts, tournamentFollowerCounts, playerFollowerCounts,
  linkDeviceAccount,
}
