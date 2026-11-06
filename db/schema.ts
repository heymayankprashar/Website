import {sqliteTable,text,integer} from "drizzle-orm/sqlite-core";
export const listings=sqliteTable("listings",{
 id:text().primaryKey(), owner:text().notNull(), event:text().notNull(), tier:text().notNull(), deadline:integer().notNull(), side:text().notNull(), price:integer().notNull(), state:text().notNull().default("open")
});
export const deals=sqliteTable("deals",{
 id:text().primaryKey(), listing:text().notNull(), buyer:text().notNull(), seller:text().notNull(), author:text().notNull(), price:integer().notNull(), state:text().notNull(), revision:integer().notNull().default(0), wallet:text(), finished:integer(), issue:text()
});
export const invites=sqliteTable("invites",{digest:text().primaryKey(),email:text().notNull(),expires:integer().notNull()});
export const sessions=sqliteTable("sessions",{digest:text().primaryKey(),email:text().notNull(),expires:integer().notNull()});
