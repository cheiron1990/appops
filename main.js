const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
// Data share
const ipcMain = require('electron').ipcMain
// Module to exec shell command
const exec = require('child_process').exec

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

/**
 * create window
 * @return {none}
 */
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Appops',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden-inset'
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
    app.quit()
  })
}

/**
 * get app list
 * @return {promise} promise with app list
 */
function getAppList () {
  return new Promise((resolve, reject) => {
    exec('adb shell pm list packages -3', (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        let arr = stdout.split('\npackage:')
        arr[0] = arr[0].slice(8)
        let apps = []
        arr.forEach((item, index, arr) => {
          let obj = {}
          obj.packageName = item
          apps.push(obj)
        })
        resolve(apps)
      }
    })
  })
}

/**
 * get permissions of one app
 * @param  {str} packageName
 * @return {promise} promise with app permissions array
 */
function getAppPermissions (packageName) {
  return new Promise((resolve, reject) => {
    exec('adb shell appops get ' + packageName, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        let arr = stdout.split('\n')
        arr.length -= 1
        if (arr[0].indexOf('No operations') !== -1) {
          arr.length = 0
        } else {
          arr.forEach((item, index, arr) => {
            let kv = item.slice(0, item.indexOf(';')).split(': ')
            arr[index] = {
              key: kv[0],
              value: kv[1]
            }
          })
        }
        let permissions = arr
        resolve(permissions)
      }
    })
  })
}

/**
 * set one permission
 * @param {str} packageName
 * @param {obj} permission  {key: str,
 *                           value: str
 *                           }
 * @return {promise}
 */
function setAppPermission (packageName, permission) {
  return new Promise((resolve, reject) => {
    exec('adb shell appops set ' + packageName + ' ' + permission.key + ' ' + permission.value, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

/**
 * set permissions of one app
 * @param {str} packageName
 * @param {array} permissions array, the item is a permission obj, reference to the function setAppPermission
 */
function setAppPermissions (packageName, permissions) {
  return new Promise((resolve, reject) => {
    // obj to store results of each permission setting process
    let result = {}
    /**
     * recursion wrap to ensure all permissions set processes to be done.
     * @param {str} packageName
     * @param {int} index
     */
    let setPermission = function (packageName, index) {
      setAppPermission(packageName, permissions[index]).then(() => {
        if (index < permissions.length - 1) {
          result[permissions[index].key] = {
            status: true
          }
          setPermission(packageName, index + 1)
        } else {
          result[permissions[index].key] = {
            status: true
          }
          resolve(result)
        }
      }, (err) => {
        if (index < permissions.length - 1) {
          result[permissions[index].key] = {
            status: false,
            err: err
          }
          setPermission(packageName, index + 1)
        } else {
          result[permissions[index].key] = {
            status: false,
            err: err
          }
          resolve(result)
        }
      })
    }
    // start
    setPermission(packageName, 0)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow()
})

ipcMain.on('getAppList', (e) => {
  getAppList().then((apps) => {
    e.sender.send('getAppList', {
      code: 1,
      data: apps
    })
  }, (err) => {
    e.sender.send('getAppList', {
      code: 0,
      errStr: err.toString(),
      err: err
    })
  })
})

ipcMain.on('getAppPermissions', (e, arg) => {
  getAppPermissions(arg).then((permissions) => {
    e.sender.send('getAppPermissions', {
      code: 1,
      packageName: arg,
      permissions: permissions
    })
  }, (err) => {
    e.sender.send('getAppPermissions', {
      code: 0,
      err: err
    })
  })
})

ipcMain.on('setAppPermissions', (e, arg) => {
  setAppPermissions(arg.packageName, arg.permissions).then((result) => {
    e.sender.send('setAppPermissions', result)
  }, (result) => {
    e.sender.send('setAppPermissions', result)
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
