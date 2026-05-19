import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

export const editions = sqliteTable('editions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  fieldCount: integer('field_count').notNull(),
  status: text('status').notNull().default('draft'), // draft | live | paused | ended
  configJson: text('config_json').notNull().default('{}'),
  crewPasswordHash: text('crew_password_hash'),
  crewSessionTokenHash: text('crew_session_token_hash'),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  endsAt: integer('ends_at', { mode: 'timestamp' }),
  winnerTeamId: integer('winner_team_id'),
  mapImagePath: text('map_image_path'),
  /** Bilingual short blurb for the join/rejoin hero (JSON LocalizedString). */
  joinDescriptionJson: text('join_description_json').notNull().default('{"de":"","en":""}'),
  joinLogoPath: text('join_logo_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const tasks = sqliteTable(
  'tasks',
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
    activityType: text('activity_type').notNull().default('quiz'), // quiz | performance | coop | media
    activityPayloadJson: text('activity_payload_json').notNull().default('{}'),
  },
  (t) => [
    unique('tasks_edition_field').on(t.editionId, t.fieldNumber),
    unique('tasks_edition_slug').on(t.editionId, t.slug),
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
    /** Stations passed without a solved task (cumulative, hellblau on board). */
    overflowFieldsJson: text('overflow_fields_json').notNull().default('[]'),
    sessionTokenHash: text('session_token_hash'),
    reachedGoalAt: integer('reached_goal_at', { mode: 'timestamp' }),
    teamSize: integer('team_size'),
    avatarId: text('avatar_id'),
    motto: text('motto'),
    onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [unique('teams_edition_name').on(t.editionId, t.name)],
)

export const turns = sqliteTable('turns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  teamId: integer('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  state: text('state').notNull(), // rolled | scanned | awaiting_crew | awaiting_crew_bg | awaiting_coop | awaiting_coop_bg | completed | abandoned
  diceValue: integer('dice_value'),
  positionFrom: integer('position_from').notNull(),
  positionPending: integer('position_pending').notNull(),
  pathPlayedFieldsJson: text('path_played_fields_json').notNull().default('[]'),
  pathOverflowFieldsJson: text('path_overflow_fields_json').notNull().default('[]'),
  /** Team overflow_fields_json before this roll — restored on zero-round abandon. */
  teamOverflowBeforeRollJson: text('team_overflow_before_roll_json'),
  hintMode: text('hint_mode'), // wait | reveal_all
  hintsUsedJson: text('hints_used_json').notNull().default('[]'),
  quizWrongAttempts: integer('quiz_wrong_attempts').notNull().default(0),
  bonusPoints: integer('bonus_points').notNull().default(0),
  hintPointsDeducted: integer('hint_points_deducted').notNull().default(0),
  scoreDelta: integer('score_delta'),
  taskId: integer('task_id').references(() => tasks.id),
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

export type CoopDepotState = 'awaiting_partner' | 'completed' | 'cancelled'

export const coopDepots = sqliteTable('coop_depots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  editionId: integer('edition_id')
    .references(() => editions.id, { onDelete: 'cascade' })
    .notNull(),
  fieldNumber: integer('field_number').notNull(),
  taskId: integer('task_id')
    .references(() => tasks.id)
    .notNull(),
  initiatorTeamId: integer('initiator_team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  partnerTeamId: integer('partner_team_id').references(() => teams.id, { onDelete: 'set null' }),
  initiatorTurnId: integer('initiator_turn_id')
    .references(() => turns.id, { onDelete: 'cascade' })
    .notNull(),
  partnerTurnId: integer('partner_turn_id').references(() => turns.id, { onDelete: 'set null' }),
  state: text('state').notNull(), // awaiting_partner | completed | cancelled
  initiatorBonusPaid: integer('initiator_bonus_paid').notNull().default(0),
  partnerBonusPaid: integer('partner_bonus_paid').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export const crewRatings = sqliteTable('crew_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  turnId: integer('turn_id')
    .references(() => turns.id, { onDelete: 'cascade' })
    .notNull(),
  rating: text('rating').notNull(), // ok | bonus
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const turnSubmissions = sqliteTable('turn_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  turnId: integer('turn_id')
    .references(() => turns.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  editionId: integer('edition_id')
    .references(() => editions.id, { onDelete: 'cascade' })
    .notNull(),
  kind: text('kind').notNull(), // photo | video | audio
  mimeType: text('mime_type').notNull(),
  originalFilename: text('original_filename'),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  durationSec: integer('duration_sec'),
  storedFilename: text('stored_filename').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
