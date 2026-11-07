import {sqliteTable,text,integer} from "drizzle-orm/sqlite-core";
export const listings=sqliteTable("listings",{
 id:text().primaryKey(), eventId:text(), owner:text().notNull(), event:text().notNull(), tier:text().notNull(), deadline:integer().notNull(), side:text().notNull(), price:integer().notNull(), state:text().notNull().default("open")
});
export const deals=sqliteTable("deals",{
 id:text().primaryKey(), cancelBy:text(), paid:integer().notNull().default(0), matched:integer(), listing:text().notNull(), buyer:text().notNull(), seller:text().notNull(), author:text().notNull(), price:integer().notNull(), state:text().notNull(), revision:integer().notNull().default(0), wallet:text(), finished:integer(), issue:text()
});
export const invites=sqliteTable("invites",{digest:text().primaryKey(),email:text().notNull(),expires:integer().notNull()});
export const sessions=sqliteTable("sessions",{digest:text().primaryKey(),email:text().notNull(),expires:integer().notNull()});
export const accounts=sqliteTable("accounts",{
 email:text().primaryKey(), principal:text().notNull().unique(), username:text().notNull().unique(), salt:text().notNull(), passwordHash:text().notNull()
});
export const messages=sqliteTable("messages",{
 id:text().primaryKey(), deal:text().notNull(), sender:text().notNull(), body:text().notNull(), created:integer().notNull()
});
export const feedback=sqliteTable("feedback",{
 id:text().primaryKey(), body:text().notNull(), created:integer().notNull()
});
export const events=sqliteTable("events",{id:text().primaryKey(),name:text().notNull(),start:integer().notNull(),venue:text(),image:text(),tiers:text().notNull()});
export const watches=sqliteTable("watches",{id:text().primaryKey(),owner:text().notNull(),eventId:text().notNull(),tier:text().notNull(),price:integer().notNull()});
export const alerts=sqliteTable("alerts",{id:text().primaryKey(),owner:text().notNull(),body:text().notNull(),path:text().notNull(),created:integer().notNull()});
export const pushDevices=sqliteTable("pushDevices",{endpoint:text().primaryKey(),owner:text().notNull()});
export const pushKeys=sqliteTable("pushKeys",{id:text().primaryKey(),secret:text().notNull(),publicKey:text().notNull()});
