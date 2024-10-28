const dotenv = require('dotenv')
const fs = require('fs').promises;
const { exec } = require('child_process');
const path = require('path');
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

const nginxConfigDir = process.env.NGINX_CONFIG_DIR;
const nginxEnabledDir = process.env.NGINX_ENABLED_DIR;
const frontendRoot = process.env.NGINX_FRONTEND_ROOT;

const createFrontendConfig = async (reseller, frontendDomain) => {
  console.log(nginxConfigDir);
  
  const frontendConf = path.join(nginxConfigDir, `${reseller}-react`);

  const frontendConfigContent = `
server {
    listen 80;
    server_name ${frontendDomain};

    root ${frontendRoot};

    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
`;

  await fs.writeFile(frontendConf, frontendConfigContent);
  await fs.symlink(frontendConf, path.join(nginxEnabledDir, `${reseller}-react`));

  return frontendConf;
};

const createBackendConfig = async (reseller, backendDomain) => {
  const backendConf = path.join(nginxConfigDir, `direct-${reseller}`);

  const backendConfigContent = `
server {
    listen 80;
    server_name ${backendDomain};

    location / {
        proxy_pass http://localhost:8050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;

  await fs.writeFile(backendConf, backendConfigContent);
  await fs.symlink(backendConf, path.join(nginxEnabledDir, `direct-${reseller}`));

  return backendConf;
};

const testNginxConfig = () => {
  return new Promise((resolve, reject) => {
    exec('nginx -t', (error, stdout, stderr) => {
      if (error) {
        return reject(`NGINX test failed: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

const restartNginx = () => {
  return new Promise((resolve, reject) => {
    exec('systemctl restart nginx', (error, stdout, stderr) => {
      if (error) {
        return reject(`Failed to restart NGINX: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

const generateSslCertificate = (domain) => {
  return new Promise((resolve, reject) => {
    exec(`certbot --nginx -d ${domain}`, (error, stdout, stderr) => {
      if (error) {
        return reject(`Failed to generate SSL for ${domain}: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

exports.configureFrontend = async (req, res) => {
  const { reseller, frontendDomain } = req.body;

  try {
    console.log('Creating NGINX configuration for frontend...');
    await createFrontendConfig(reseller, frontendDomain);

    console.log('Testing NGINX configuration...');
    await testNginxConfig();

    console.log('Restarting NGINX...');
    await restartNginx();

    console.log('Generating SSL certificate for frontend...');
    await generateSslCertificate(frontendDomain);

    res.status(200).json({
      status: 'success',
      message: `Frontend configuration and SSL setup completed for ${frontendDomain}`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.configureBackend = async (req, res) => {
  const { reseller, backendDomain } = req.body;

  try {
    console.log('Creating NGINX configuration for backend...');
    await createBackendConfig(reseller, backendDomain);

    console.log('Testing NGINX configuration...');
    await testNginxConfig();

    console.log('Restarting NGINX...');
    await restartNginx();

    console.log('Generating SSL certificate for backend...');
    await generateSslCertificate(backendDomain);

    res.status(200).json({
      status: 'success',
      message: `Backend configuration and SSL setup completed for ${backendDomain}`
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};