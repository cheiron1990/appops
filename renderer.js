// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const ipcRenderer = require('electron').ipcRenderer;

(() => {
  // events
  const customEvents = {
    loadingstart: new Event('loading-start'),
    loadingend: new Event('loading-end')
  }
  document.addEventListener('loading-start', (e) => {
    let loading = document.querySelector('.loading')
    loading.style.display = 'block'
    loading.className = 'loading loading-start'
  })
  document.addEventListener('loading-end', (e) => {
    let loading = document.querySelector('.loading')
    loading.className = 'loading loading-end'
  })
  //
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
    },
    showLoading: function (msg) {
      let msgDom = document.querySelector('.loading-msg')
      msgDom.innerHTML = msg
      document.dispatchEvent(customEvents.loadingstart)
    },
    hideLoading: function () {
      document.dispatchEvent(customEvents.loadingend)
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
        commonMethod.showLoading('正在获取App权限列表...')
      }
    })
    // save to appItems
    appItems[app.packageName] = {
      dom: item,
      label: app.packageName
    }
    getLabel(app.packageName).then((obj) => {
      // set icon
      icon.style.backgroundColor = 'transparent'
      icon.style.borderRadius = '0'
      icon.style.backgroundSize = 'contain'
      icon.style.backgroundImage = 'url("' + obj.logo + '")'
      // set label
      btn.innerHTML = obj.label
      // save to appItems
      appItems[app.packageName].label = obj.label
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
        commonMethod.showLoading('正在设置App权限...')
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
  function search (keyword) {
    if (keyword) {
      for (let k in appItems) {
        if (k.indexOf(keyword) !== -1 || appItems[k].label.indexOf(keyword) !== -1) {
          appItems[k].dom.style.display = 'block'
        } else {
          appItems[k].dom.style.display = 'none'
        }
      }
    } else {
      for (let k in appItems) {
        appItems[k].dom.style.display = 'block'
      }
    }
  }
  //
  ipcRenderer.on('getAppPermissions', (e, arg) => {
    if (arg.code) {
      renderAppPermissions(arg.packageName, arg.permissions)
      commonMethod.hideLoading()
    } else {
      console.log(arg.err)
      commonMethod.hideLoading()
    }
  })
  //
  ipcRenderer.on('getAppList', (e, arg) => {
    if (arg.code) {
      document.getElementById('err').style.display = 'none'
      renderAppList(arg.data)
      commonMethod.hideLoading()
    } else {
      document.getElementById('errStr').innerHTML = arg.errStr
      document.getElementById('errCode').innerHTML = arg.err.code
      document.getElementById('errCmd').innerHTML = arg.err.cmd
      document.getElementById('errSignal').innerHTML = arg.err.signal == null ? arg.err.signal : 'null'
      document.getElementById('errKilled').innerHTML = arg.err.killed
      document.getElementById('err').style.display = 'block'
      commonMethod.hideLoading()
    }
  })
  ipcRenderer.on('setAppPermissions', (e, arg) => {
    commonMethod.hideLoading()
    let all = true
    let str = ''
    for (let k in arg) {
      if (arg[k].status) {
        str = str + ' ' + k + ' set successful. \n'
      } else {
        all = false
        str = str + ' ' + k + ' set failed. reason: ' + arg[k].err + '\n'
      }
    }
    if (all) {
      str = 'all successful.'
    }
    window.alert(str)
  })
  // init
  ipcRenderer.send('getAppList')
  commonMethod.showLoading('正在加载App列表...')
  // refresh
  let btnRefresh = document.getElementById('btnRefresh')
  btnRefresh.addEventListener('click', (e) => {
    let contents = document.getElementById('appList').childNodes
    for (let i = contents.length - 1; i >= 0; i--) {
      document.getElementById('appList').removeChild(contents[i])
    }
    ipcRenderer.send('getAppList')
    commonMethod.showLoading('正在加载App列表...')
  })
  // search
  var appItems = {}
  let searchInput = document.getElementById('searchInput')
  searchInput.addEventListener('change', (e) => {
    let keyword = e.target.value
    search(keyword)
  })
  searchInput.addEventListener('keyup', (e) => {
    let keyword = e.target.value
    search(keyword)
  })
  // search input drag set
  searchInput.addEventListener('focus', (e) => {
    e.target.style['-webkit-app-region'] = 'no-drag'
  })
  searchInput.addEventListener('blur', (e) => {
    e.target.style['-webkit-app-region'] = 'no-drag'
  })
  // scroll
  ;(() => {
    let header = document.querySelector('header')
    let coordinate
    //
    function getScrollDirection (pageYOffset) {
      if (typeof coordinate === 'undefined') {
        coordinate = pageYOffset
      }
      let diff = coordinate - pageYOffset
      if (diff < 0) {
        coordinate = pageYOffset
        return 'down'
      } else if (diff > 0) {
        coordinate = pageYOffset
        return 'up'
      } else {
        coordinate = pageYOffset
        return false
      }
    }
    //
    function scrollEffect (direction) {
      switch (direction) {
        case 'up':
          header.className = 'show'
          break
        case 'down':
          header.className = 'hide'
          break
        default:
          break
      }
    }
    document.addEventListener('scroll', (e) => {
      scrollEffect(getScrollDirection(window.pageYOffset))
    })
  })()
})()

