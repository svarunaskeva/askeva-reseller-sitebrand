const fs = require("fs");
const { exec } = require("child_process");

const updateNginxConfig = (domainUrl) => {
  return new Promise((resolve, reject) => {
    fs.readFile(process.env.NGINX_CONFIG_FILE, "utf8", (err, data) => {
      if (err) return reject("Failed to read NGINX config file");

      const serverNameRegex = /server_name\s+(.*?);/;
      const match = data.match(serverNameRegex);

      if (match) {
        const currentDomains = match[1].split(/\s+/);
        if (currentDomains.includes(domainUrl)) {
          return resolve("Domain already exists in NGINX config");
        }

        const updatedDomains = [...new Set([...currentDomains, domainUrl])];
        const updatedConfig = data.replace(
          serverNameRegex,
          `server_name ${updatedDomains.join(" ")};`
        );

        fs.writeFile(
          process.env.NGINX_CONFIG_FILE,
          updatedConfig,
          "utf8",
          (err) => {
            if (err) return reject("Failed to write updated NGINX config file");
            resolve("NGINX config updated successfully");
          }
        );
      } else {
        reject("No server_name directive in NGINX config");
      }
    });
  });
};

const testNginxConfig = () => {
  return new Promise((resolve, reject) => {
    exec("nginx -t", (error, stdout, stderr) => {
      if (error) return reject(stderr);
      resolve(stdout);
    });
  });
};

const restartNginx = () => {
  return new Promise((resolve, reject) => {
    exec("systemctl restart nginx", (error, stdout, stderr) => {
      if (error) return reject(stderr);
      resolve(stdout);
    });
  });
};

module.exports = { updateNginxConfig, testNginxConfig, restartNginx };
