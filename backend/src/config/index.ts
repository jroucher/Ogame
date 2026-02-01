import dotenv from 'dotenv';

dotenv.config();

export const config = {
  ogame: {
    serverNumber: process.env.OGAME_SERVER_NUMBER || '270',
    universeName: process.env.OGAME_UNIVERSE_NAME || 'Ophiuchus',
    email: process.env.OGAME_EMAIL || '',
    password: process.env.OGAME_PASSWORD || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  browser: {
    headless: process.env.HEADLESS === 'true',
  },
};
