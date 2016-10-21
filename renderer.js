// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const remote = require('electron').remote;
const ipcRenderer = require('electron').ipcRenderer;

function renderApp(app){
	let item = document.createElement('div');
	item.className = 'app';
	let btn = document.createElement('a');
	btn.className = 'app-name'
	btn.innerHTML = item.id = app.packageName;
	item.appendChild(btn);
	btn.addEventListener('click', function(e){
		let _form = item.getElementsByTagName('form');
		if(_form.length > 0){
			for (let i = _form.length - 1; i >= 0; i--) {
				item.removeChild(_form[i]);
			}
			item.className = 'app';
		}else{
			ipcRenderer.send('getAppPermissions', app.packageName);
		}
	});
	return item;
}

function renderAppList(apps) {
	let container = document.getElementById('appList');
	apps.forEach(function(item, index, arr){
		container.appendChild(renderApp(item));
	});
}

function renderAppPermissions(packageName, permissions){
	let container = document.getElementById(packageName);
	let _form = container.getElementsByTagName('form');
	if(_form.length > 0){
		for (let i = _form.length - 1; i >= 0; i--) {
			container.removeChild(_form[i]);
		}
		container.className = 'app';
	}
	let form = document.createElement('form');
	if(permissions.length > 0){
		let ul = document.createElement('ul');
		let permissionNames = [];
		permissions.forEach(function(item, index, arr){
			permissionNames.push(item.key);
			let li = document.createElement('li');
			let label = document.createElement('label');
			label.innerHTML = item.key;
			label.setAttribute('for', item.key);
			let valueList = document.createElement('select');
			valueList.id = valueList.name = item.key;
			let allowOption = document.createElement('option');
			allowOption.innerHTML = allowOption.value = 'allow';
			let ignoreOption = document.createElement('option');
			ignoreOption.innerHTML = ignoreOption.value = 'ignore';
			let denyOption = document.createElement('option');
			denyOption.innerHTML = denyOption.value = 'deny';
			let defaultOption = document.createElement('option');
			defaultOption.innerHTML = defaultOption.value = 'default';
			switch (item.value){
				case 'allow':
					allowOption.selected = 'selected';
					break;
				case 'ignore':
					ignoreOption.selected = 'selected';
					break;
				case 'deny':
					denyOption.selected = 'selected';
					break;
				default:
					defaultOption.selected = 'selected';
			}
			valueList.appendChild(allowOption);
			valueList.appendChild(ignoreOption);
			valueList.appendChild(defaultOption);
			li.appendChild(label);
			li.appendChild(valueList);
			ul.appendChild(li);
		});
		let btn = document.createElement('button');
		btn.type = 'submit';
		btn.innerHTML = '设置';
		form.appendChild(ul);
		form.appendChild(btn);
		
		btn.addEventListener('click', function(e){
			e.preventDefault();
			let data = [];
			permissionNames.forEach(function(item, index, arr){
				let obj = {
					key: item,
					value: form[item].value
				};
				data.push(obj);
			});
			ipcRenderer.send('setAppPermissions', {
				packageName: packageName,
				permissions: data
			});
		});
	}else{
		let tip = document.createElement('p');
		tip.innerHTML = 'This app has no permission.';
		form.appendChild(tip);
	}
	container.appendChild(form);
	container.className = 'app open';
}

ipcRenderer.on('getAppPermissions', function(e, arg){
	if(arg.code){
		renderAppPermissions(arg.packageName, arg.permissions);
	}else{
		console.log(arg.err);
	}
});

ipcRenderer.on('getAppList', function(e, arg){
	if(arg.code){
		renderAppList(arg.data);
	}else{
		console.log(arg.err);
	}
});


// init
ipcRenderer.send('getAppList');

// refresh
let btnRefresh = document.getElementById('btnRefresh');
btnRefresh.addEventListener('click', function(e){
	let contents = document.getElementById('appList').childNodes;
	for (let i = contents.length - 1; i >= 0; i--) {
		document.getElementById('appList').removeChild(contents[i]);
	}
	ipcRenderer.send('getAppList');
});