const fs = require('fs');
const path = require('path');

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const writeFileIfMissing = (filePath, content) => {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, content, 'utf8');
};

const main = () => {
  const projectRoot = process.cwd();
  const nodeModulesDir = path.join(projectRoot, 'node_modules');
  const stubDir = path.join(nodeModulesDir, 'react-native-worklets');

  // In Reanimated 3.x + RN 0.76.x we should NOT install `react-native-worklets` (native)
  // but some tooling may try to resolve `react-native-worklets/plugin`. Provide a stub
  // that forwards to the compatible `react-native-worklets-core/plugin`.
  if (!fs.existsSync(nodeModulesDir)) {
    return;
  }

  ensureDir(stubDir);

  writeFileIfMissing(
    path.join(stubDir, 'package.json'),
    JSON.stringify(
      {
        name: 'react-native-worklets',
        private: true,
        version: '0.0.0-stub',
        main: 'index.js',
      },
      null,
      2
    ) + '\n'
  );

  writeFileIfMissing(
    path.join(stubDir, 'plugin.js'),
    "module.exports = require('react-native-worklets-core/plugin');\n"
  );

  writeFileIfMissing(
    path.join(stubDir, 'index.js'),
    "module.exports = require('react-native-worklets-core');\n"
  );
};

main();
