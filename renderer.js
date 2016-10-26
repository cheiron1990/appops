// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const ipcRenderer = require('electron').ipcRenderer;

(() => {
  const commonMethod = {
    get: function (url) {
      return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
              resolve(xhr)
            } else {
              reject(xhr)
            }
          }
        }
        xhr.open('get', url, true)
        xhr.send(null)
      })
    }
  }
  //
  function getLabel (packageName) {
    return new Promise((resolve, reject) => {
      if (localStorage.getItem(packageName + '_logo') && localStorage.getItem(packageName + '_label')){
        let logo = localStorage.getItem(packageName + '_logo')
        let label = localStorage.getItem(packageName + '_label')
        resolve({
          logo: logo,
          label: label
        })
      } else {
        commonMethod.get('https://play.google.com/store/apps/details?id=' + packageName).then((xhr) => {
          let htmlStr = xhr.response
          let parser = new DOMParser()
          let dom = parser.parseFromString(htmlStr, 'text/html')
          let logo = 'https:' + dom.querySelector('.cover-image').getAttribute('src')
          let label = dom.querySelector('.id-app-title').innerHTML
          // save
          localStorage.setItem(packageName + '_logo', logo)
          localStorage.setItem(packageName + '_label', label)
          resolve({
            logo: logo,
            label: label
          })
        }, (xhr) => {
          reject(xhr.status)
        })
      }
    })
  }
  //
  function renderApp (app) {
    let item = document.createElement('div')
    item.className = 'app'
    let icon = document.createElement('div')
    icon.className = 'app-icon'
    let btn = document.createElement('a')
    btn.className = 'app-name'
    btn.innerHTML = item.id = app.packageName
    item.appendChild(icon)
    item.appendChild(btn)
    btn.addEventListener('click', function (e) {
      let _form = item.getElementsByTagName('form')
      if (_form.length > 0) {
        for (let i = _form.length - 1; i >= 0; i--) {
          item.removeChild(_form[i])
        }
        item.className = 'app'
      } else {
        ipcRenderer.send('getAppPermissions', app.packageName)
      }
    })
    getLabel(app.packageName).then((obj) => {
      // set icon
      icon.style.backgroundColor = 'transparent'
      icon.style.borderRadius = '0'
      icon.style.backgroundSize = 'contain'
      icon.style.backgroundImage = 'url("' + obj.logo + '")'
      // set label
      btn.innerHTML = obj.label
    }, (errCode) => {
      console.log(errCode)
    })
    return item
  }
  //
  function renderAppList (apps) {
    let container = document.getElementById('appList')
    apps.forEach(function (item, index, arr) {
      container.appendChild(renderApp(item))
    })
  }
  //
  function renderAppPermissions (packageName, permissions) {
    let container = document.getElementById(packageName)
    let _form = container.getElementsByTagName('form')
    if (_form.length > 0) {
      for (let i = _form.length - 1; i >= 0; i--) {
        container.removeChild(_form[i])
      }
      container.className = 'app'
    }
    let form = document.createElement('form')
    if (permissions.length > 0) {
      let ul = document.createElement('ul')
      let permissionNames = []
      permissions.forEach((item, index, arr) => {
        permissionNames.push(item.key)
        let li = document.createElement('li')
        let label = document.createElement('label')
        label.innerHTML = item.key
        label.setAttribute('for', item.key)
        let valueList = document.createElement('select')
        valueList.id = valueList.name = item.key
        let allowOption = document.createElement('option')
        allowOption.innerHTML = allowOption.value = 'allow'
        let ignoreOption = document.createElement('option')
        ignoreOption.innerHTML = ignoreOption.value = 'ignore'
        let denyOption = document.createElement('option')
        denyOption.innerHTML = denyOption.value = 'deny'
        let defaultOption = document.createElement('option')
        defaultOption.innerHTML = defaultOption.value = 'default'
        switch (item.value) {
          case 'allow':
            allowOption.selected = 'selected'
            break
          case 'ignore':
            ignoreOption.selected = 'selected'
            break
          case 'deny':
            denyOption.selected = 'selected'
            break
          default:
            defaultOption.selected = 'selected'
        }
        valueList.appendChild(allowOption)
        valueList.appendChild(ignoreOption)
        valueList.appendChild(defaultOption)
        li.appendChild(label)
        li.appendChild(valueList)
        ul.appendChild(li)
      })
      let btn = document.createElement('button')
      btn.type = 'submit'
      btn.innerHTML = '设置'
      form.appendChild(ul)
      form.appendChild(btn)
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        let data = []
        permissionNames.forEach((item, index, arr) => {
          let obj = {
            key: item,
            value: form[item].value
          }
          data.push(obj)
        })
        ipcRenderer.send('setAppPermissions', {
          packageName: packageName,
          permissions: data
        })
      })
    } else {
      let tip = document.createElement('p')
      tip.innerHTML = 'This app has no permission.'
      form.appendChild(tip)
    }
    container.appendChild(form)
    container.className = 'app open'
  }
  //
  ipcRenderer.on('getAppPermissions', (e, arg) => {
    if (arg.code) {
      renderAppPermissions(arg.packageName, arg.permissions)
    } else {
      console.log(arg.err)
    }
  })
  //
  ipcRenderer.on('getAppList', (e, arg) => {
    if (arg.code) {
      document.getElementById('err').style.display = 'none'
      renderAppList(arg.data)
    } else {
      document.getElementById('errStr').innerHTML = arg.errStr
      document.getElementById('errCode').innerHTML = arg.err.code
      document.getElementById('errCmd').innerHTML = arg.err.cmd
      document.getElementById('errSignal').innerHTML = arg.err.signal == null ? arg.err.signal : 'null'
      document.getElementById('errKilled').innerHTML = arg.err.killed
      document.getElementById('err').style.display = 'block'
    }
  })
  // init
  ipcRenderer.send('getAppList')
  // refresh
  let btnRefresh = document.getElementById('btnRefresh')
  btnRefresh.addEventListener('click', (e) => {
    let contents = document.getElementById('appList').childNodes
    for (let i = contents.length - 1; i >= 0; i--) {
      document.getElementById('appList').removeChild(contents[i])
    }
    ipcRenderer.send('getAppList')
  })
})()

