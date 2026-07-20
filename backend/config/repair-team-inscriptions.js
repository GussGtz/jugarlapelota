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
// adelante. Este backfill SOLO llena equipos con club_key todavía NULL,
// preservando la agrupación que ya existe hoy (por nombre) como punto de
// partida — no intenta adivinar cuál de dos equipos ya mezclados es el
// "correcto", solo congela el estado actual y bloquea fusiones futuras.
async function backfillClubKeys({ query }) {
  try {
    const teams = (await query('SELECT id, tournament_id, name, inscription_id FROM teams WHERE club_key IS NULL')).rows
    let updated = 0
    for (const t of teams) {
      const key = t.inscription_id
        ? `insc:${t.inscription_id}`
        : `legacy:${t.tournament_id}:${String(t.name).trim().toLowerCase()}`
      await query('UPDATE teams SET club_key=$1 WHERE id=$2', [key, t.id])
      updated++
    }
    if (updated) console.log(`🔧  [repair-team-inscriptions] club_key asignado a ${updated} equipo(s)`)
  } catch (e) {
    console.warn(`⚠️  [repair-team-inscriptions] no se pudo asignar club_key (${e.message})`)
  }
}

module.exports = { repairTeamInscriptions, backfillClubKeys }
