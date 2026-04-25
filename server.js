import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT) || 5400;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});