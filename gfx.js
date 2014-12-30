"use strict";
var ui = require("./uiutil");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
exports.loaded = false;
function load(preload, postload){
	exports.load = undefined;
	var loadingBar = new PIXI.Graphics();
	preload(loadingBar);
	var singles = ["gold", "bg_quest", "bg_game", "bg_questmap"];
	var assets = ["esheet", "raritysheet", "backsheet", "cardborders", "statussheet", "statusborders", "typesheet"].concat(singles);
	var names = {
		esheet: ["eicons", 32],
		raritysheet: ["ricons", 25],
		backsheet: ["cardBacks", 132],
		cardborders: ["cardBorders", 128],
		statussheet: ["sicons", 13],
		typesheet: ["ticons", 25],
		statusborders: ["sborders", 64],
	};
	var loadCount = 0;
	assets.forEach(function(asset){
		var img = new Image();
		img.addEventListener("load", function(){
			loadCount++;
			loadingBar.clear();
			loadingBar.beginFill(loadCount == assets.length ? 0x336699 : 0xFFFFFF);
			loadingBar.drawRect(0, 568, 900*(1-loadCount/assets.length), 32);
			loadingBar.endFill();
			var obj = names[asset], tex = new PIXI.Texture(new PIXI.BaseTexture(this));
			if (obj){
				var ts = [], w = obj[1];
				for (var x = 0; x < tex.width; x += w){
					ts.push(new PIXI.Texture(tex, new PIXI.Rectangle(x, 0, w, tex.height)));
				}
				exports[obj[0]] = ts;
			}else exports[asset] = tex;
			if (loadCount == assets.length){
				var ui = require("./uiutil");
				ui.loadSounds("cardClick", "buttonClick", "permPlay", "creaturePlay");
				exports.ricons[-1] = exports.ricons[5];
				exports.loaded = true;
				postload();
			}
		});
		img.src = "assets/" + asset + ".png";
	});
}
var caimgcache = {}, crimgcache = {}, wsimgcache = {}, artcache = {}, artimagecache = {};
function makeArt(card, art, oldrend) {
	var rend = oldrend || new PIXI.RenderTexture(132, 256);
	var template = new PIXI.DisplayObjectContainer();
	template.addChild(new PIXI.Sprite(exports.cardBacks[card.element+(card.upped?13:0)]));
	var rarity = new PIXI.Sprite(exports.ricons[card.rarity]);
	rarity.anchor.set(0, 1);
	rarity.position.set(5, 252);
	template.addChild(rarity);
	if (art) {
		var artspr = new PIXI.Sprite(art);
		artspr.position.set(2, 20);
		if (card.shiny) artspr.filters = [shinyFilter];
		template.addChild(artspr);
	}
	var typemark = new PIXI.Sprite(exports.ticons[card.type]);
	typemark.anchor.set(1, 1);
	typemark.position.set(128, 252);
	template.addChild(typemark);
	var nametag = new PIXI.Text(card.name, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
	nametag.position.set(2, 4);
	template.addChild(nametag);
	if (card.cost) {
		var text = new PIXI.Text(card.cost, { font: "12px Dosis", fill: card.upped ? "black" : "white" });
		text.anchor.x = 1;
		text.position.set(rend.width-3, 4);
		template.addChild(text);
		if (card.costele != card.element) {
			var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
			eleicon.position.set(rend.width-text.width-5, 10);
			eleicon.anchor.set(1, .5);
			eleicon.scale.set(.5, .5);
			template.addChild(eleicon);
		}
	}
	var infospr = new PIXI.Sprite(ui.getTextImage(card.info(), ui.mkFont(11, card.upped ? "black" : "white"), "", rend.width-4));
	infospr.position.set(2, 150);
	template.addChild(infospr);
	rend.render(template, null, true);
	return rend;
}
function getArtImage(code, cb){
	if (!(code in artimagecache)){
		var redcode = code;
		if (artpool){
			while (!(redcode in artpool) && redcode >= "6qo"){
				redcode = etgutil[redcode >= "g00"?"asShiny":"asUpped"](redcode, false);
			}
			if (!(redcode in artpool)) return cb(artimagecache[code] = undefined);
			else if (redcode in artimagecache) return cb(artimagecache[code] = artimagecache[redcode]);
		}
		var img = new Image();
		img.addEventListener("load", function(){
			return cb(artimagecache[code] = new PIXI.Texture(new PIXI.BaseTexture(img)));
		});
		img.src = "Cards/" + redcode + ".png";
	}
	return cb(artimagecache[code]);
}
function getArt(code) {
	if (artcache[code]) return artcache[code];
	else {
		return getArtImage(code, function(art){
			return artcache[code] = makeArt(Cards.Codes[code], art, artcache[code]);
		});
	}
}
function getCardImage(code) {
	if (caimgcache[code]) return caimgcache[code];
	else {
		var card = Cards.Codes[code];
		var rend = new PIXI.RenderTexture(100, 20);
		var graphics = new PIXI.Graphics();
		graphics.lineStyle(1, card && card.shiny ? 0xdaa520 : 0x222222);
		graphics.beginFill(card ? ui.maybeLighten(card) : code == "0" ? 0x887766 : 0x111111);
		graphics.drawRect(0, 0, 99, 19);
		graphics.endFill();
		if (card) {
			var clipwidth = rend.width-2;
			if (card.cost) {
				var text = new PIXI.Text(card.cost, { font: "11px Dosis", fill: card.upped ? "black" : "white" });
				text.anchor.x = 1;
				text.position.set(rend.width-2, 5);
				graphics.addChild(text);
				clipwidth -= text.width+2;
				if (card.costele != card.element) {
					var eleicon = new PIXI.Sprite(exports.eicons[card.costele]);
					eleicon.position.set(clipwidth, 10);
					eleicon.anchor.set(1, .5);
					eleicon.scale.set(.5, .5);
					graphics.addChild(eleicon);
					clipwidth -= 18;
				}
			}
			var text = new PIXI.Text(card.name, { font: "11px Dosis", fill: card.upped ? "black" : "white" });
			text.position.set(2, 5);
			if (text.width > clipwidth){
				text.mask = new PIXI.Graphics();
				text.mask.beginFill();
				text.mask.drawRect(0, 0, clipwidth, 20);
				text.mask.endFill();
			}
			graphics.addChild(text);
		}
		rend.render(graphics);
		return caimgcache[code] = rend;
	}
}
function getInstImage(code, scale, cache){
	return cache[code] || getArtImage(code, function(art) {
		var card = Cards.Codes[code];
		var rend = new PIXI.RenderTexture(Math.ceil(128 * scale), Math.ceil(164 * scale));
		var border = new PIXI.Sprite(exports.cardBorders[card.element + (card.upped ? 13 : 0)]);
		var graphics = new PIXI.Graphics();
		border.addChild(graphics);
		graphics.beginFill(ui.maybeLighten(card));
		graphics.drawRect(0, 16, 128, 128);
		graphics.endFill();
		if (card.shiny){
			graphics.lineStyle(2, 0xdaa520);
			graphics.moveTo(0, 14);
			graphics.lineTo(128, 14);
			graphics.moveTo(0, 147);
			graphics.lineTo(128, 147);
		}
		if (art) {
			var artspr = new PIXI.Sprite(art);
			artspr.position.set(0, 16);
			if (card.shiny) artspr.filters = [shinyFilter];
			border.addChild(artspr);
		}
		var text = new PIXI.Text(card.name, { font: "16px Dosis", fill: card.upped ? "black" : "white" });
		text.anchor.x = .5;
		text.position.set(64, 144);
		border.addChild(text);
		var mtx = new PIXI.Matrix();
		mtx.scale(scale, scale);
		rend.render(border, mtx);
		return cache[code] = rend;
	});
}
function getCreatureImage(code) {
	return getInstImage(code, .5, crimgcache);
}
function getWeaponShieldImage(code) {
	return getInstImage(code, 5/8, wsimgcache);
}
var artpool;
exports.preloadCardArt = function(art){
	var pool = {};
	for(var i=0; i<art.length; i+=3){
		pool[art.substr(i, 3)] = true;
	}
	artpool = pool;
	(function loadArt(i){
		if (i == art.length) return;
		var code = art.substr(i, 3);
		var img = new Image();
		img.onload = function(){
			this.onload = undefined;
			artimagecache[code] = new PIXI.Texture(new PIXI.BaseTexture(this));
			loadArt(i+3);
		}
		img.src = "Cards/" + code + ".png";
	})(0);
}
if (typeof PIXI !== "undefined"){
	exports.nopic = PIXI.Texture.emptyTexture;
	exports.nopic.width = exports.nopic.height = 0;
	exports.load = load;
	exports.getPermanentImage = exports.getCreatureImage = getCreatureImage;
	exports.getArt = getArt;
	exports.getCardImage = getCardImage;
	exports.getWeaponShieldImage = getWeaponShieldImage;
	var shinyFilter = new PIXI.ColorMatrixFilter();
	shinyFilter.matrix = [
		0,1,0,0,
		0,0,1,0,
		1,0,0,0,
		0,0,0,1,
	];
}