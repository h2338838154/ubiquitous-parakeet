import { pgTable, serial, timestamp, index, pgPolicy, varchar, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const logisticsData = pgTable("logistics_data", {
	id: serial().primaryKey().notNull(),
	date: varchar({ length: 20 }).default('').notNull(),
	timeSlot: varchar("time_slot", { length: 20 }).default('').notNull(),
	shiftType: varchar("shift_type", { length: 10 }).default('白班'),
	frequency: varchar({ length: 20 }).default('进口'),
	unloadCount: integer("unload_count").default(0),
	unloadPrice: numeric("unload_price", { precision: 10, scale:  2 }).default('0'),
	unloadProfit: numeric("unload_profit", { precision: 10, scale:  2 }).default('0'),
	unloadLoss: numeric("unload_loss", { precision: 10, scale:  2 }).default('0'),
	packageCount: integer("package_count").default(0),
	packagePrice: numeric("package_price", { precision: 10, scale:  2 }).default('0'),
	packageProfit: numeric("package_profit", { precision: 10, scale:  2 }).default('0'),
	packageLoss: numeric("package_loss", { precision: 10, scale:  2 }).default('0'),
	loopCount: integer("loop_count").default(0),
	loopPrice: numeric("loop_price", { precision: 10, scale:  2 }).default('0'),
	loopProfit: numeric("loop_profit", { precision: 10, scale:  2 }).default('0'),
	loopLoss: numeric("loop_loss", { precision: 10, scale:  2 }).default('0'),
	otherCost: numeric("other_cost", { precision: 10, scale:  2 }).default('0'),
	senderCount: integer("sender_count").default(0),
	personCount: integer("person_count").default(0),
	receiverCount: integer("receiver_count").default(0),
	totalProfit: numeric("total_profit", { precision: 10, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("logistics_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	index("logistics_date_time_idx").using("btree", table.date.asc().nullsLast().op("text_ops"), table.timeSlot.asc().nullsLast().op("text_ops")),
	index("logistics_time_slot_idx").using("btree", table.timeSlot.asc().nullsLast().op("text_ops")),
	pgPolicy("logistics_data_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("logistics_data_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("logistics_data_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("logistics_data_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);

export const shiftConfig = pgTable("shift_config", {
	id: serial().notNull(),
	date: varchar({ length: 20 }).notNull(),
	shiftType: varchar("shift_type", { length: 10 }).default('白班'),
	unloadCount: integer("unload_count").default(0),
	packageCount: integer("package_count").default(0),
	loopCount: integer("loop_count").default(0),
	senderCount: integer("sender_count").default(0),
	receiverCount: integer("receiver_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("shift_config_date_idx").using("btree", table.date.asc().nullsLast().op("text_ops")),
	pgPolicy("shift_config_允许公开删除", { as: "permissive", for: "delete", to: ["public"], using: sql`true` }),
	pgPolicy("shift_config_允许公开更新", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("shift_config_允许公开写入", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("shift_config_允许公开读取", { as: "permissive", for: "select", to: ["public"] }),
]);
