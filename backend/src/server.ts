import "dotenv/config";

import { app } from "./app.js";
import { prisma } from "./prisma/prisma.service.js";

const port = Number(process.env.PORT ?? 4000);

const startServer = async () => {
  try {
    await prisma.$connect();

    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect Prisma:", error);
    process.exit(1);
  }
};

void startServer();
