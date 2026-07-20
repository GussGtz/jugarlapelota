// Repara datos de equipos que quedaron desligados de su inscripción antes de
// que POST/PUT /teams empezaran a heredar inscription_id y sincronizar
// categories_json (ver backend/routes/index.js, syncInscriptionCategory).
// Se corre en cada arranque, igual que db-unique-guards — es idempotente y
// solo AGREGA datos faltantes, nunca borra ni sobreescribe algo existente:
//   1) A un equipo sin inscription_id que comparte nombre (mismo torneo) con
//      un equipo "hermano" que sí tiene inscription_id, le hereda ese id.
//   2) A la inscripción de cada equipo vinculado, le agrega en categories_json
//      cualquier categoría del equipo que todavía no esté ahí.
async function repairTeamInscriptions({ query }) {
  try {
    const teams = (await query('SELECT id, tournament_id, name, category_id, inscription_id FROM teams')).rows

    const byKey = new Map()
    for (const t of teams) {
      const key = `${t.tournament_id}::${String(t.name).trim().toLowerCase()}`
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(t)
    }

    let backfilled = 0
    for (const group of byKey.values()) {
      const withInsc = group.find(t => t.inscription_id)
      if (!withInsc) continue
      for (const t of group) {
        if (!t.inscription_id) {
          await query('UPDATE teams SET inscription_id=$1 WHERE id=$2', [withInsc.inscription_id, t.id])
          t.inscription_id = withInsc.inscription_id
          backfilled++
        }
      }
    }

    const inscriptionIds = [...new Set(teams.filter(t => t.inscription_id).map(t => t.inscription_id))]
    let synced = 0
    for (const inscId of inscriptionIds) {
      const { rows } = await query('SELECT categories_json FROM inscriptions WHERE id=$1', [inscId])
      const insc = rows[0]
      if (!insc) continue
      let cats = []
      try { cats = JSON.parse(insc.categories_json || '[]') } catch { cats = [] }
      const existingIds = new Set(cats.map(c => String(c.id)))
      const linkedTeams = teams.filter(t => t.inscription_id === inscId && t.category_id)
      let changed = false
      for (const t of linkedTeams) {
        if (existingIds.has(String(t.category_id))) continue
        const { rows: catRows } = await query('SELECT id,name FROM categories WHERE id=$1', [t.category_id])
        const cat = catRows[0]
        if (!cat) continue
        cats.push({ id: cat.id, name: cat.name, teamName: t.name })
        existingIds.add(String(cat.id))
        changed = true
      }
      if (changed) {
        await query('UPDATE inscriptions SET categories_json=$1 WHERE id=$2', [JSON.stringify(cats), inscId])
        synced++
      }
    }

    if (backfilled || synced) {
      console.log(`🔧  [repair-team-inscriptions] inscription_id restaurado en ${backfilled} equipo(s), categories_json sincronizado en ${synced} inscripción(es)`)
    }
  } catch (e) {
    console.warn(`⚠️  [repair-team-inscriptions] no se pudo ejecutar (${e.message})`)
  }
}

// admin/Teams.vue agrupaba equipos SOLO por nombre (sin distinguir clubes
// distintos que coinciden en nombre, ej. dos "TIGRES" no relacionados) —
// eso podía fusionar visualmente dos equipos ajenos y, al editar uno,
// borrar de verdad al otro (api.delete disparado por save()/toRemove).
// club_key es la identidad estable que evita esa fusión de aquí en
// adelante. IMPORTANTE: una misma inscripción puede tener VARIOS equipos
// con nombres distintos (feature "varios equipos por categoría" — ej. un
// club inscribe "Club X", "Club X Verde" y "Club X Azul" bajo la misma
// inscripción) — así que el club_key de un equipo ligado a inscripción
// SIEMPRE debe incluir también su nombre normalizado, no solo el
// inscription_id, o equipos distintos de la misma inscripción se fusionan
// en una sola tarjeta (bug real detectado en producción: "Venados FC
// Filial Cancún" Azul/Verde/sin-color, los 3 con el mismo inscription_id,
// terminaron mostrando una sola tarjeta con categorías duplicadas).
// Este backfill SOLO llena equipos con club_key todavía NULL, preservando
// la agrupación que ya existe hoy (por nombre) como punto de partida.
function clubKeyFor(t) {
  const name = String(t.name).trim().toLowerCase()
  return t.inscription_id ? `insc:${t.inscription_id}:${name}` : `legacy:${t.tournament_id}:${name}`
}

async function backfillClubKeys({ query }) {
  try {
    const teams = (await query('SELECT id, tournament_id, name, inscription_id FROM teams WHERE club_key IS NULL')).rows
    let updated = 0
    for (const t of teams) {
      await query('UPDATE teams SET club_key=$1 WHERE id=$2', [clubKeyFor(t), t.id])
      updated++
    }
    if (updated) console.log(`🔧  [repair-team-inscriptions] club_key asignado a ${updated} equipo(s)`)
  } catch (e) {
    console.warn(`⚠️  [repair-team-inscriptions] no se pudo asignar club_key (${e.message})`)
  }
}

// Corrige equipos que ya recibieron el club_key viejo y defectuoso
// "insc:{id}" (sin el nombre) — asignado por una versión anterior de
// backfillClubKeys antes de detectar el bug de arriba. Sin esto, esos
// equipos quedarían fusionados para siempre porque ya no tienen
// club_key NULL (backfillClubKeys de arriba ya no los toca).
async function fixLegacyInscriptionClubKeys({ query }) {
  try {
    const teams = (await query(
      "SELECT id, tournament_id, name, inscription_id, club_key FROM teams WHERE club_key LIKE 'insc:%' AND inscription_id IS NOT NULL"
    )).rows
    let fixed = 0
    for (const t of teams) {
      if (t.club_key !== `insc:${t.inscription_id}`) continue // ya tiene el formato correcto (con nombre)
      await query('UPDATE teams SET club_key=$1 WHERE id=$2', [clubKeyFor(t), t.id])
      fixed++
    }
    if (fixed) console.log(`🔧  [repair-team-inscriptions] club_key corregido (fusión indebida por inscripción) en ${fixed} equipo(s)`)
  } catch (e) {
    console.warn(`⚠️  [repair-team-inscriptions] no se pudo corregir club_key legacy (${e.message})`)
  }
}

// Recuperación puntual de un incidente reportado (2026-07-20): el equipo
// "Venados FC Filial Cancún" (sin color), inscripción #31 del torneo Copa
// Caribe (tournament_id 2), tenía equipos en Sub-7/Sub-13/Sub-15 (sin
// "Azul"/"Verde", a diferencia de Sub-9/Sub-11 que sí tenían ambos colores)
// — esas 3 filas ya no existen en la tabla teams. Confirmado con el usuario
// (consultas directas a la BD de producción):
//   - El equipo de Sub-7 tenía id=227 y 11 jugadores reales YA CARGADOS en
//     `players` con team_id=227 (huérfanos — la fila del equipo se borró
//     pero los jugadores no, porque el borrado ocurrió antes de que
//     existiera la restricción de llave foránea, o esta nunca se aplicó
//     retroactivamente en esta tabla). Se recrea con el MISMO id=227 para
//     que esos 11 jugadores se re-enlacen solos, sin tocar cada uno.
//   - Sub-13 y Sub-15 no tenían jugadores — se recrean con id nuevo.
// Insertar un id explícito en una columna BIGSERIAL es seguro aquí: ya
// existen equipos con id mayor a 227 (228, 229...), así que la secuencia ya
// pasó ese punto y nunca volverá a generarlo por accidente.
// Idempotente — no hace nada si las filas ya existen ni si la inscripción
// #31 ya no existe. Cuando ya no aplique, este bloque puede borrarse sin
// dejar rastro (no lo usa ninguna otra parte del código).
async function recoverVenadosFilialCancun({ query }) {
  try {
    const INSC_ID = 31, TOURNAMENT_ID = 2, NAME = 'Venados FC Filial Cancún'
    const LOGO = 'https://res.cloudinary.com/dok6cmxfp/image/upload/v1784142789/jugarlapelota/jpaiducbu5dxvrtnjopg.jpg'
    const insc = await query('SELECT id FROM inscriptions WHERE id=$1', [INSC_ID])
    if (!insc.rows.length) return
    const clubKey = `insc:${INSC_ID}:${NAME.trim().toLowerCase()}`

    // Sub-7 (category_id=17) — mismo id=227 para reenlazar a los 11 jugadores ya existentes
    const existing227 = await query('SELECT id FROM teams WHERE id=227', [])
    if (!existing227.rows.length) {
      await query(
        'INSERT INTO teams (id,tournament_id,category_id,name,logo,inscription_id,club_key) VALUES (227,$1,$2,$3,$4,$5,$6)',
        [TOURNAMENT_ID, 17, NAME, LOGO, INSC_ID, clubKey]
      )
      console.log('🔧  [recover-venados] equipo id=227 (Sub-7) recreado — 11 jugadores reenlazados automáticamente')
    }

    // Sub-13 (19) y Sub-15 (18) — mismo club, sin jugadores registrados aún
    let created = 0
    for (const catId of [19, 18]) {
      const already = await query(
        'SELECT id FROM teams WHERE tournament_id=$1 AND category_id=$2 AND inscription_id=$3',
        [TOURNAMENT_ID, catId, INSC_ID]
      )
      if (already.rows.length) continue
      await query(
        'INSERT INTO teams (tournament_id,category_id,name,logo,inscription_id,club_key) VALUES ($1,$2,$3,$4,$5,$6)',
        [TOURNAMENT_ID, catId, NAME, LOGO, INSC_ID, clubKey]
      )
      created++
    }
    if (created) console.log(`🔧  [recover-venados] equipo "${NAME}" recreado en ${created} categoría(s) más (Sub-13/Sub-15)`)
  } catch (e) {
    console.warn(`⚠️  [recover-venados] no se pudo ejecutar (${e.message})`)
  }
}

module.exports = { repairTeamInscriptions, backfillClubKeys, fixLegacyInscriptionClubKeys, recoverVenadosFilialCancun }
