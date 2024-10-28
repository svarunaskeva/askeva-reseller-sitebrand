const dotenv = require("dotenv");
const express = require("express");
const bodyParser = require("body-parser");
const { configureBackend, configureFrontend } = require("./controllers/nginxController");
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

const app = express();
app.use(bodyParser.json());

app.post('/setup-frontend', configureFrontend);
app.post('/setup-backend', configureBackend);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NGINX management server running on port ${PORT}`);
});
