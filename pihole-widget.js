// Parameters:
// {"url":"https://pihole","apikey":"123abc"}
// Optional key in parameters: "theme": system|light|dark, "apiPath": "/api"

let piholeURL = "" //set the URL here for debug
let piholeAppPassword = "" // set the API-key here for debug
let wTheme = "" // set the theme for debug

let piholeApiPath = "/api"

if (config.runsInWidget) {
const widgetParams = (args.widgetParameter != null ? JSON.parse(args.widgetParameter) : null)
if (widgetParams==null) {
throw new Error("Please long press the widget and add the parameters.")
} else if (!widgetParams.hasOwnProperty("url") && !widgetParams.hasOwnProperty("apikey")) {
throw new Error("Wrong parameters.")
}

piholeURL = widgetParams.url
piholeAppPassword = widgetParams.apikey

if (widgetParams.hasOwnProperty("theme")) {
	wTheme = widgetParams.theme
}
if (widgetParams.hasOwnProperty("apiPath")) {
piholeApiPath = widgetParams.apiPath
}

}

let wBackground = new LinearGradient()
let wColor = new Color("#ffffff")
setTheme()

let sid = await authenticate();

let piholeStats = await sendGetRequest("/stats/summary", sid);

let dns = await sendGetRequest("/dns/blocking", sid);

let version = await sendGetRequest("/info/version", sid);

let wSize = config.widgetFamily || "small" //set size of widget for debug
let widget = await createWidget() || null

if (!config.runsInWidget) {
if (wSize=="large") { await widget.presentLarge() }
else if (wSize=="medium") { await widget.presentMedium() }
else { await widget.presentSmall() }
}

await invalidateSession(sid);

Script.setWidget(widget)
Script.complete()

async function createWidget() {
let w = new ListWidget()
w.backgroundGradient = wBackground
w.addSpacer()
w.setPadding(5, 15, 0, (wSize=="small" ? 0 : 10))

let state = (piholeStats!=null ? (dns.blocking=="enabled" ? true : false) : null)
let icn = null

if (state==true) {
	icn = SFSymbol.named((state ? "checkmark.shield.fill" : "xmark.shield.fill"))
} else {
	icn = SFSymbol.named("xmark.circle.fill")
	state = false
}

let topStack = w.addStack()
let content = topStack.addImage(icn.image)
content.tintColor = (state ? Color.green() : Color.red())
content.imageSize = new Size(16,16)
topStack.addSpacer(5)

content = topStack.addText("Pi-hole")
content.font = Font.blackSystemFont(16)
content.textColor = wColor


if (state==true && wSize != "small") {
	topStack.addSpacer()
  	topStack.addText("    ") // same line with distance to title

addUpdateItem(topStack, (version.version.core.local.version==version.version.core.remote.version ? true : false), "Pi" + ((wSize=="small") ? "" : "-hole"))
topStack.addText("  ")
addUpdateItem(topStack, (version.version.web.local.version==version.version.web.remote.version ? true : false), "WebUI")
topStack.addText("  ")
addUpdateItem(topStack, (version.version.ftl.local.version==version.version.ftl.remote.version ? true : false), "FTL")
	
}


w.addSpacer(8)

if (piholeStats==null) {
	content = w.addText("No connection")
    content.font = Font.thinSystemFont(14)
    content.textColor = wColor
	w.addSpacer()
	return w
}

w.url = piholeURL + "/admin/"

addItem(w, "Total Queries", `${piholeStats.queries.total}` )
	
layoutStack = w.addStack()
layoutStack.setPadding(5, 0, 0, 10)
layoutStack.centerAlignContent()
	
addItem(w, "Queries Blocked", `${piholeStats.queries.blocked}`)
	
layoutStack = w.addStack()
layoutStack.setPadding(5, 0, 0, 10)
layoutStack.centerAlignContent()
	

addItem(w, "Percent Blocked", piholeStats.queries.percent_blocked.toFixed(1) + "%")
	
layoutStack = w.addStack()
layoutStack.setPadding(5, 0, 0, 10)
layoutStack.centerAlignContent()
	
addItem(w, "Domains on Blocklist", `${piholeStats.gravity.domains_being_blocked}`)

if (wSize=="large") {
	addItem(w, "Unique Domains", `${piholeStats.queries.unique_domains}`)
	
	layoutStack = w.addStack()
	layoutStack.setPadding(5, 0, 0, 10)
	
	addItem(w, "Cached Queries", `${piholeStats.queries.cached}`)
	
	layoutStack = w.addStack()
	layoutStack.setPadding(5, 0, 0, 10)
	
	addItem(w, "Queries Forwarded", `${piholeStats.queries.cached}`)
}

w.addSpacer()
return w
}

function addItem(w, strHeadline, strData) {
let fontSizeHeadline = 12
let fontSizeString = 9
switch (wSize) {
case "large":
fontSizeHeadline = 18
fontSizeString = 14
break;
case "medium":
fontSizeHeadline = 14
fontSizeString = 11
break;
}

let layoutStack = w.addStack()
layoutStack.setPadding(3, 0, 0, 10)
layoutStack.centerAlignContent()
	
content = layoutStack.addText(strHeadline)
content.font = Font.mediumSystemFont(fontSizeHeadline)
content.textColor = wColor
layoutStack.addSpacer()
	
content = layoutStack.addText(strData)
content.font = Font.mediumSystemFont(fontSizeString)
content.textColor = wColor
}

function setTheme() {
if (wTheme=="system") {
if (Device.isUsingDarkAppearance()) {
wTheme = "dark"
} else {
wTheme = "light"
}
}
wBackground.locations = [0, 1]
if (wTheme=="dark") {
wBackground.colors = [
new Color("#384d54"),
new Color("#384d54")
]
wColor = new Color("#ffffff")
} else {
wBackground.colors = [
new Color("#ffffffe6"),
new Color("#ffffffe6")
]
wColor = new Color("#000000")
}
}

async function sendGetRequest(endpoint, sid) {
try {
let req = new Request(piholeURL + piholeApiPath + endpoint)
req.headers = { 'accept': 'application/json', "sid": sid};

	let json = await req.loadJSON();

	return json
} catch {
	return null
}
}

function addUpdateItem(stack, status, text) {
let icn = SFSymbol.named((status ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"))
let content = stack.addImage(icn.image)
content.tintColor = (status ? Color.green() : Color.red())
content.imageSize = new Size(14,14)
content = stack.addText(((wSize!="small") ? " " : "" ) + text)
content.font = Font.semiboldMonospacedSystemFont(12)
content.textColor = wColor
}

async function authenticate() {
try {
let req = new Request(piholeURL + piholeApiPath + "/auth")
req.method = 'POST'
req.body = JSON.stringify({ password: piholeAppPassword });

	let json = await req.loadJSON()

	if (!json.session?.valid) {
		throw new Error("Authentication failed");
	}
	return json.session?.sid
} catch {
	return null
}
}

async function invalidateSession(sid){
try {
let req = new Request(piholeURL + piholeApiPath+ "/auth")
req.method = 'DELETE'
req.headers = { 'accept': 'application/json', "sid": sid};

	let json = await req.load()

} catch { }
}