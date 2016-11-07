#!/bin/sh
package_path=dist/mac/appops.app/Contents

mkdir -p dist/mac
rm -rf appops.app
cp -R node_modules/.1.4.3@electron/dist/Electron.app dist/mac/appops.app
cp resources/appops.icns ${package_path}/Resources/appops.icns
cp resources/info.plist ${package_path}/info.plist
mv ${package_path}/MacOS/Electron ${package_path}/MacOS/Appops
mkdir ${package_path}/Resources/app
cp index.html ${package_path}/Resources/app/index.html
cp main.js ${package_path}/Resources/app/main.js
cp package.json ${package_path}/Resources/app/package.json
cp -R assets ${package_path}/Resources/app/assets