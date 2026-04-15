import { pgTable, serial, timestamp, unique, pgPolicy, varchar, bigint, numeric, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const businessData = pgTable("business_data", {
	id: serial().primaryKey().notNull(),
	syncId: varchar("sync_id", { length: 100 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"日期": bigint("日期", { mode: "number" }),
	"时段": varchar("时段", { length: 20 }),
	"班次": varchar("班次", { length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"卸车量": bigint("卸车量", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"环线量": bigint("环线量", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"集包量": bigint("集包量", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"管理": bigint("管理", { mode: "number" }).default(0),
	"管理薪资": numeric("管理薪资").default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"卸车人数": bigint("卸车人数", { mode: "number" }).default(0),
	"卸车薪资": numeric("卸车薪资").default('0'),
	"卸车盈亏": numeric("卸车盈亏").default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"集包人数": bigint("集包人数", { mode: "number" }).default(0),
	"集包收入": numeric("集包收入").default('0'),
	"集包薪资": numeric("集包薪资").default('0'),
	"集包盈亏": numeric("集包盈亏").default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"环线人数": bigint("环线人数", { mode: "number" }).default(0),
	"环线收入": numeric("环线收入").default('0'),
	"环线薪资": numeric("环线薪资").default('0'),
	"环线盈亏": numeric("环线盈亏").default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"文件人数": bigint("文件人数", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"发验人数": bigint("发验人数", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"客服人数": bigint("客服人数", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"接发员": bigint("接发员", { mode: "number" }).default(0),
	"其他成本": numeric("其他成本").default('0'),
	"总盈亏": numeric("总盈亏").default('0'),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"总表人数": bigint("总表人数", { mode: "number" }).default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	"总成本": numeric("总成本").default('0'),
}, (table) => [
	unique("business_data_sync_id_key").on(table.syncId),
	pgPolicy("Allow all for business_data", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
]);

export const shiftConfigs = pgTable("shift_configs", {
	id: serial().primaryKey().notNull(),
	dateKey: varchar("date_key", { length: 50 }).notNull(),
	white: integer().default(70),
	middle: integer().default(0),
	night: integer().default(95),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	ownWhite: integer("own_white").default(0),
	ownMiddle: integer("own_middle").default(0),
	ownNight: integer("own_night").default(0),
	laborWhite: integer("labor_white").default(0),
	laborNight: integer("labor_night").default(0),
	dailyWhite: integer("daily_white").default(0),
	dailyNight: integer("daily_night").default(0),
	assessAmount: numeric("assess_amount").default('0'),
}, (table) => [
	unique("shift_configs_date_key_key").on(table.dateKey),
	pgPolicy("Allow all for shift_configs", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("Allow all operations", { as: "permissive", for: "all", to: ["public"] }),
]);

export const businessDataBackup = pgTable("business_data_backup", {
	id: integer(),
	date: varchar({ length: 20 }),
	timeSlot: varchar("time_slot", { length: 20 }),
	shiftType: varchar("shift_type", { length: 10 }),
	frequency: varchar({ length: 20 }),
	unloadCount: integer("unload_count"),
	unloadPrice: numeric("unload_price", { precision: 10, scale:  2 }),
	unloadProfit: numeric("unload_profit", { precision: 10, scale:  2 }),
	unloadLoss: numeric("unload_loss", { precision: 10, scale:  2 }),
	packageCount: integer("package_count"),
	packagePrice: numeric("package_price", { precision: 10, scale:  2 }),
	packageProfit: numeric("package_profit", { precision: 10, scale:  2 }),
	packageLoss: numeric("package_loss", { precision: 10, scale:  2 }),
	loopCount: integer("loop_count"),
	loopPrice: numeric("loop_price", { precision: 10, scale:  2 }),
	loopProfit: numeric("loop_profit", { precision: 10, scale:  2 }),
	loopLoss: numeric("loop_loss", { precision: 10, scale:  2 }),
	otherCost: numeric("other_cost", { precision: 10, scale:  2 }),
	senderCount: integer("sender_count"),
	personCount: integer("person_count"),
	receiverCount: integer("receiver_count"),
	totalProfit: numeric("total_profit", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	shiftWhite: integer("shift_white"),
	shiftMiddle: integer("shift_middle"),
	shiftNight: integer("shift_night"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"日期": bigint("日期", { mode: "number" }),
	"时段": varchar("时段"),
	"班次": varchar("班次"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"卸车量": bigint("卸车量", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"环线量": bigint("环线量", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"集包量": bigint("集包量", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"管理": bigint("管理", { mode: "number" }),
	"管理薪资": numeric("管理薪资"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"卸车人数": bigint("卸车人数", { mode: "number" }),
	"卸车人效": numeric("卸车人效"),
	"卸车薪资": numeric("卸车薪资"),
	"卸车盈亏": numeric("卸车盈亏"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"集包人数": bigint("集包人数", { mode: "number" }),
	"集包人效": numeric("集包人效"),
	"集包单价": numeric("集包单价"),
	"集包收入": numeric("集包收入"),
	"集包薪资": numeric("集包薪资"),
	"集包盈亏": numeric("集包盈亏"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"环线人数": bigint("环线人数", { mode: "number" }),
	"环线人效": numeric("环线人效"),
	"环线单价": numeric("环线单价"),
	"环线收入": numeric("环线收入"),
	"环线薪资": numeric("环线薪资"),
	"环线盈亏": numeric("环线盈亏"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"文件人数": bigint("文件人数", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"发验人数": bigint("发验人数", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"客服人数": bigint("客服人数", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"接发员": bigint("接发员", { mode: "number" }),
	"其他成本": numeric("其他成本"),
	"总盈亏": numeric("总盈亏"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"人数验证": bigint("人数验证", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	"总表人数": bigint("总表人数", { mode: "number" }),
	syncId: varchar("sync_id"),
});
