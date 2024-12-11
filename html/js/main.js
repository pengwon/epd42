let bleDevice;
let gattServer;
let epdService;
let epdCharacteristic;
let reconnectTrys = 0;

let canvas;
let startTime;
let chunkSize = 38;

function resetVariables() {
	gattServer = null;
	epdService = null;
	epdCharacteristic = null;
	document.getElementById("log").value = '';
}

async function handleError(error) {
	console.log(error);
	resetVariables();
	if (bleDevice == null)
		return;
	if (reconnectTrys <= 5) {
		reconnectTrys++;
		await connect();
	}
	else {
		addLog("连接失败！");
		reconnectTrys = 0;
	}
}

async function sendCommand(cmd) {
	if (epdCharacteristic) {
		await epdCharacteristic.writeValue(cmd);
	} else {
		addLog("服务不可用，请检查蓝牙连接");
	}
}

async function sendcmd(cmdTXT) {
	addLog(`发送命令: ${cmdTXT}`);
	await sendCommand(hexToBytes(cmdTXT));
}

async function setDriver() {
	const driver = document.getElementById("epddriver").value;
	const pins = document.getElementById("epdpins").value;
	await sendcmd(`00${pins}`);
	await sendcmd(`01${driver}`);
}

async function clearscreen() {
	if(confirm('确认清除屏幕内容?')) {
		await sendcmd("02");
	}
}

async function sendCmWithData(cmd, data){
	const count = Math.round(data.length / chunkSize);
	let chunkIdx = 0;

	await sendcmd(`03${cmd}`);
	for (let i = 0; i < data.length; i += chunkSize) {
		let currentTime = (new Date().getTime() - startTime) / 1000.0;
		let chunk = data.substring(i, i + chunkSize);
		setStatus(`命令：0x${cmd}, 数据块: ${chunkIdx+1}/${count+1}, 总用时: ${currentTime}s`);
		await sendcmd(`04${chunk}`);
		chunkIdx++;
	}
}

async function send4GrayLut() {
	await sendcmd("0300");
	await sendcmd("043F"); // Load LUT from register

	await sendCmWithData("20", "000A0000000160141400000100140000000100130A010001000000000000000000000000000000000000"); // vcom
	await sendCmWithData("21", "400A0000000190141400000110140A000001A01301000001000000000000000000000000000000000000"); // red not use
	await sendCmWithData("22", "400A0000000190141400000100140A000001990C01030401000000000000000000000000000000000000"); // bw r
	await sendCmWithData("23", "400A0000000190141400000100140A000001990B04040101000000000000000000000000000000000000"); // wb w
	await sendCmWithData("24", "800A0000000190141400000120140A000001501301000001000000000000000000000000000000000000"); // bb b
	await sendCmWithData("25", "400A0000000190141400000110140A000001A01301000001000000000000000000000000000000000000"); // vcom
}

async function sendimg(cmdIMG) {
	startTime = new Date().getTime();
	const driver = document.getElementById("epddriver").value;
	const mode = document.getElementById('dithering').value;
	const imgArray = cmdIMG.replace(/(?:\r\n|\r|\n|,|0x| )/g, '');
	const bwArrLen = (canvas.width/8) * canvas.height * 2;

	if (imgArray.length == bwArrLen * 2) {
		await sendCmWithData("10", imgArray.slice(0, bwArrLen - 1));
		await sendCmWithData("13", imgArray.slice(bwArrLen));
	} else {
		await sendCmWithData(driver === "03" ? "10" : "13", imgArray);
	}
	if (mode === "4gray") {
		await send4GrayLut();
		await sendcmd("05");
		await sendcmd(`01${driver}`); // restore lut
	} else {
		await sendcmd("05");
	}

	const sendTime = (new Date().getTime() - startTime) / 1000.0;
	addLog(`发送完成！耗时: ${sendTime}s`);
	setStatus(`发送完成！耗时: ${sendTime}s`);
}

function updateButtonStatus() {
	const connected = gattServer != null && gattServer.connected;
	const status = connected ? null : 'disabled';
	document.getElementById("sendcmdbutton").disabled = status;
	document.getElementById("clearscreenbutton").disabled = status;
	document.getElementById("sendimgbutton").disabled = status;
	document.getElementById("setDriverbutton").disabled = status;
}

function disconnect() {
	resetVariables();
	addLog('已断开连接.');
	document.getElementById("connectbutton").innerHTML = '连接';
	updateButtonStatus();
}

async function preConnect() {
	if (gattServer != null && gattServer.connected) {
		if (bleDevice != null && bleDevice.gatt.connected) {
			await sendcmd("06");
			bleDevice.gatt.disconnect();
		}
	}
	else {
		connectTrys = 0;
		bleDevice = await navigator.bluetooth.requestDevice({
			optionalServices: ['62750001-d828-918d-fb46-b6c11c675aec'],
			acceptAllDevices: true
		});
		await bleDevice.addEventListener('gattserverdisconnected', disconnect);
		try {
			await connect();
		} catch (e) {
			await handleError(e);
		}
	}
}

async function reConnect() {
	connectTrys = 0;
	if (bleDevice != null && bleDevice.gatt.connected)
		bleDevice.gatt.disconnect();
	resetVariables();
	addLog("正在重连");
	setTimeout(async function () { await connect(); }, 300);
}

async function connect() {
	if (epdCharacteristic == null) {
		addLog("正在连接: " + bleDevice.name);

		gattServer = await bleDevice.gatt.connect();
		addLog('> 找到 GATT Server');

		epdService = await gattServer.getPrimaryService('62750001-d828-918d-fb46-b6c11c675aec');
		addLog('> 找到 EPD Service');

		epdCharacteristic = await epdService.getCharacteristic('62750002-d828-918d-fb46-b6c11c675aec');
		addLog('> 找到 Characteristic');

		await epdCharacteristic.startNotifications();
		epdCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
			addLog(`> 收到配置：${bytesToHex(event.target.value.buffer)}`);
			document.getElementById("epdpins").value = bytesToHex(event.target.value.buffer.slice(0, 7));
			document.getElementById("epddriver").value = bytesToHex(event.target.value.buffer.slice(7, 8));
		});

		await sendcmd("01");

		document.getElementById("connectbutton").innerHTML = '断开';
		updateButtonStatus();
	}
}

function setStatus(statusText) {
	document.getElementById("status").innerHTML = statusText;
}

function addLog(logTXT) {
	const today = new Date();
	const time = ("0" + today.getHours()).slice(-2) + ":" + ("0" + today.getMinutes()).slice(-2) + ":" + ("0" + today.getSeconds()).slice(-2) + " : ";
	document.getElementById("log").innerHTML += time + logTXT + '<br>';
	console.log(time + logTXT);
	while ((document.getElementById("log").innerHTML.match(/<br>/g) || []).length > 10) {
		var logs_br_position = document.getElementById("log").innerHTML.search("<br>");
		document.getElementById("log").innerHTML = document.getElementById("log").innerHTML.substring(logs_br_position + 4);
	}
}

function hexToBytes(hex) {
	for (var bytes = [], c = 0; c < hex.length; c += 2)
		bytes.push(parseInt(hex.substr(c, 2), 16));
	return new Uint8Array(bytes);
}

function bytesToHex(data) {
	return new Uint8Array(data).reduce(
		function (memo, i) {
			return memo + ("0" + i.toString(16)).slice(-2);
		}, "");
}

function intToHex(intIn) {
	let stringOut = ("0000" + intIn.toString(16)).substr(-4)
	return stringOut.substring(2, 4) + stringOut.substring(0, 2);
}

function updateImageData(canvas) {
	const driver = document.getElementById("epddriver").value;
	const mode = document.getElementById('dithering').value;
	if (mode === '4gray') {
		document.getElementById('cmdIMAGE').value = bytesToHex(canvas2gray(canvas));
	} else {
		document.getElementById('cmdIMAGE').value = bytesToHex(canvas2bytes(canvas, 'bw'));
		if (driver === '03') {
			if (mode.startsWith('bwr')) {
				document.getElementById('cmdIMAGE').value += bytesToHex(canvas2bytes(canvas, 'red'));
			} else {
				const count = document.getElementById('cmdIMAGE').value.length;
				document.getElementById('cmdIMAGE').value += 'F'.repeat(count);
			}
		}
	}
}

async function update_image () {
	const canvas = document.getElementById("canvas");
	const ctx = canvas.getContext("2d");

	let image = new Image();;
	const image_file = document.getElementById('image_file');
	if (image_file.files.length > 0) {
		const file = image_file.files[0];
		image.src = URL.createObjectURL(file);
	} else {
		image.src = document.getElementById('demo-img').src;
	}

	image.onload = function(event) {
		URL.revokeObjectURL(this.src);
		ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
		convert_dithering()
	}
}

function clear_canvas() {
	if(confirm('确认清除画布内容?')) {
		const ctx = canvas.getContext("2d");
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		document.getElementById('cmdIMAGE').value = '';
	}
}

function convert_dithering() {
	const ctx = canvas.getContext("2d");
	const mode = document.getElementById('dithering').value;
	if (mode.startsWith('bwr')) {
		ditheringCanvasByPalette(canvas, bwrPalette, mode);
	} else if (mode === '4gray') {
		dithering(ctx, canvas.width, canvas.height, 4, "gray");
	} else {
		dithering(ctx, canvas.width, canvas.height, parseInt(document.getElementById('threshold').value), mode);
	}
	updateImageData(canvas);
}

document.body.onload = () => {
	canvas = document.getElementById('canvas');

	updateButtonStatus();
	update_image();

	document.getElementById('dithering').value = 'none';
}