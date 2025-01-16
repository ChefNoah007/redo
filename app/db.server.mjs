// app/db.server.mjs
import { PrismaClient } from "@prisma/client";

// In Nicht-Production-Umgebungen Prisma nur einmal instanzieren:
if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
}

const prisma = global.prisma || new PrismaClient();

export default prisma;
