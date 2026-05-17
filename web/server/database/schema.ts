import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

export const editions = sqliteTable('editions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  fieldCount: integer('field_count').notNull(),
  status: text('status').notNull().default('draft'), // draft | live | paused | ended
  configJson: text('config_json').notNull().default('{}'),
  crewPasswordHash: text('crew_password_hash'),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  winnerTeamId: integer('winner_team_id'),
  mapImagePath: text('map_image_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const stations = sqliteTable(
  'stations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    editionId: integer('edition_id')
      .references(() => editions.id, { onDelete: 'cascade' })
      .notNull(),
    fieldNumber: integer('field_number').notNull(),
    slug: text('slug').notNull(),
    hintVague: text('hint_vague').notNull(),
    hintLevel1: text('hint_level_1').notNull(),
    hintLevel2: text('hint_level_2').notNull(),
    mapX: integer('map_x').notNull(),
    mapY: integer('map_y').notNull(),
    qrToken: text('qr_token').notNull(),
    taskType: text('task_type').notNull().default('quiz'), // quiz | performance
    taskPayloadJson: text('task_payload_json').notNull().default('{}'),
  },
  (t) => [
    unique('stations_edition_field').on(t.editionId, t.fieldNumber),
    unique('stations_edition_slug').on(t.editionId, t.slug),
  ],
)

export const teams = sqliteTable(
  'teams',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    editionId: integer('edition_id')
      .references(() => editions.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    pinHash: text('pin_hash').notNull(),
    teamQrToken: text('team_qr_token').notNull(),
    positionConfirmed: integer('position_confirmed').notNull().default(0),
    scoreTotal: integer('score_total').notNull().default(0),
    completedFieldsJson: text('completed_fields_json').notNull().default('[]'),
    sessionTokenHash: text('session_token_hash'),
    reachedGoalAt: integer('reached_goal_at', { mode: 'timestamp' }),
    teamSize: integer('team_size'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [unique('teams_edition_name').on(t.editionId, t.name)],
)

export const turns = sqliteTable('turns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  state: text('state').notNull(), // rolled | scanned | awaiting_crew | completed | abandoned
  diceValue: integer('dice_value'),
  positionFrom: integer('position_from').notNull(),
  positionPending: integer('position_pending').notNull(),
  hintMode: text('hint_mode'), // wait | reveal_all
  hintsUsedJson: text('hints_used_json').notNull().default('[]'),
  quizWrongAttempts: integer('quiz_wrong_attempts').notNull().default(0),
  bonusPoints: integer('bonus_points').notNull().default(0),
  hintPointsDeducted: integer('hint_points_deducted').notNull().default(0),
  scoreDelta: integer('score_delta'),
  stationId: integer('station_id').references(() => stations.id),
  rolledAt: integer('rolled_at', { mode: 'timestamp' }),
  scannedAt: integer('scanned_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const adminUsers = sqliteTable('admin_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const crewRatings = sqliteTable('crew_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  turnId: integer('turn_id')
    .references(() => turns.id, { onDelete: 'cascade' })
    .notNull(),
  rating: text('rating').notNull(), // ok | bonus
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
