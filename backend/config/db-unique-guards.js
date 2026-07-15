// Índices únicos "seguros para producción" — a diferencia de un ALTER TABLE
// directo, cada guard primero revisa si YA existen filas duplicadas para esa
// combinación de columnas. Si las hay, el índice NO se crea (crear un UNIQUE
// INDEX sobre datos con duplicados falla y, peor, si el error se traga en
// silencio como hacen las demás migraciones, el índice queda deshabilitado
// para siempre sin que nadie se entere). En vez de eso: se loguea un aviso
// claro con ejemplos para revisión manual, y en el siguiente arranque —una
// vez limpiados los duplicados— el índice se crea solo. No se borra ni
// modifica ningún dato automáticamente.
//
// IMPORTANTE: estos índices son la ÚLTIMA línea de defensa contra condiciones
// de carrera (dos requests simultáneas pasando ambas el check de "SELECT para
// revisar duplicados" antes de que cualquiera haga el INSERT). Los checks a
// nivel aplicación en routes/index.js siguen siendo la validación principal
// (dan mensajes de error específicos); esto es el respaldo que garantiza que
// la base de datos nunca termine con datos duplicados aunque la aplicación
// tenga un bug o dos requests lleguen en el mismo instante.
const GUARDS = [
  {
    name: 'players_team_curp',
    // Mismo criterio que el check en POST/PUT de jugadores: CURP única dentro
    // de un mismo equipo (un inscription tiene un team por categoría, así que
    // esto equivale a "única por equipo+categoría", sin bloquear la misma
    // CURP en otra categoría).
    findDuplicatesSql: `
      SELECT team_id, curp, COUNT(*) AS n FROM players
      WHERE curp IS NOT NULL
      GROUP BY team_id, curp HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_players_team_curp ON players(team_id, curp) WHERE curp IS NOT NULL`,
  },
  {
    name: 'players_team_number',
    findDuplicatesSql: `
      SELECT team_id, number, COUNT(*) AS n FROM players
      WHERE number IS NOT NULL
      GROUP BY team_id, number HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_players_team_number ON players(team_id, number) WHERE number IS NOT NULL`,
  },
  {
    name: 'inscription_players_curp',
    findDuplicatesSql: `
      SELECT inscription_id, category_id, curp, COUNT(*) AS n FROM inscription_players
      WHERE curp IS NOT NULL
      GROUP BY inscription_id, category_id, curp HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_inscplayers_insc_cat_curp ON inscription_players(inscription_id, category_id, curp) WHERE curp IS NOT NULL`,
  },
  {
    // Nombre nuevo (no reutiliza uq_inscplayers_insc_cat_number): un índice ya
    // creado con ese nombre en producción no se redefine solo por cambiar el
    // SQL de createIndexSql — "CREATE ... IF NOT EXISTS" contra un nombre que
    // ya existe es un no-op silencioso, dejaría la definición VIEJA (sin
    // team_name) corriendo para siempre. El índice viejo se elimina abajo.
    name: 'inscription_players_team_number',
    // Incluye team_name: dos equipos DISTINTOS en la misma categoría (ej.
    // "Club X A"/"Club X B") sí pueden repetir el mismo dorsal, cada uno
    // tiene su propio roster. La migración de db-schema.js/db-sqlite-init.js
    // backfillea team_name en filas viejas para que nunca quede NULL aquí
    // (NULL no choca consigo mismo en un índice único, lo que dejaría de
    // detectar dorsales duplicados en categorías de un solo equipo).
    dropIndexSql: `DROP INDEX IF EXISTS uq_inscplayers_insc_cat_number`,
    findDuplicatesSql: `
      SELECT inscription_id, category_id, team_name, number, COUNT(*) AS n FROM inscription_players
      WHERE number IS NOT NULL
      GROUP BY inscription_id, category_id, team_name, number HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_inscplayers_insc_cat_team_number ON inscription_players(inscription_id, category_id, team_name, number) WHERE number IS NOT NULL`,
  },
  {
    name: 'inscriptions_tournament_teamname',
    // Excluye status='rejected' — igual que el check de POST /inscriptions,
    // un equipo rechazado libera su nombre para volver a inscribirse.
    findDuplicatesSql: `
      SELECT tournament_id, LOWER(TRIM(team_name)) AS tn, COUNT(*) AS n FROM inscriptions
      WHERE status <> 'rejected'
      GROUP BY tournament_id, LOWER(TRIM(team_name)) HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_inscriptions_tournament_teamname ON inscriptions(tournament_id, LOWER(TRIM(team_name))) WHERE status <> 'rejected'`,
  },
  {
    name: 'inscription_responsables_curp',
    findDuplicatesSql: `
      SELECT inscription_id, category_id, curp, COUNT(*) AS n FROM inscription_responsables
      WHERE curp IS NOT NULL
      GROUP BY inscription_id, category_id, curp HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_inscresp_insc_cat_curp ON inscription_responsables(inscription_id, category_id, curp) WHERE curp IS NOT NULL`,
  },
  {
    name: 'teams_tournament_category_name',
    // COALESCE(category_id,0) para que dos equipos sin categoría (category_id
    // IS NULL) con el mismo nombre también choquen — un UNIQUE INDEX normal
    // trata cada NULL como distinto entre sí, igual que el check de la app
    // usa "IS NOT DISTINCT FROM" para lograr esta misma semántica NULL-safe.
    findDuplicatesSql: `
      SELECT tournament_id, COALESCE(category_id,0) AS cat, LOWER(TRIM(name)) AS tn, COUNT(*) AS n FROM teams
      GROUP BY tournament_id, COALESCE(category_id,0), LOWER(TRIM(name)) HAVING COUNT(*) > 1`,
    createIndexSql: `CREATE UNIQUE INDEX IF NOT EXISTS uq_teams_tournament_category_name ON teams(tournament_id, COALESCE(category_id,0), LOWER(TRIM(name)))`,
  },
]

async function applyUniqueGuards({ query, exec }) {
  for (const g of GUARDS) {
    try {
      if (g.dropIndexSql) await exec(g.dropIndexSql)
      const { rows: dupes } = await query(g.findDuplicatesSql)
      if (dupes.length) {
        console.warn(
          `⚠️  [db-unique-guards] "${g.name}": ${dupes.length} grupo(s) duplicado(s) — ` +
          `índice único NO creado hasta que se limpien manualmente. Ejemplos:`,
          dupes.slice(0, 5)
        )
        continue
      }
      await exec(g.createIndexSql)
    } catch (e) {
      console.warn(`⚠️  [db-unique-guards] "${g.name}": no se pudo verificar/crear (${e.message})`)
    }
  }
}

module.exports = { applyUniqueGuards }
