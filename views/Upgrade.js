"use strict";
var px = require("./px");
var gfx = require("./gfx");
var sock = require("./sock");
var Cards = require("./Cards");
var etgutil = require("./etgutil");
var userutil = require("./userutil");
module.exports = function() {
	function upgradeCard(card) {
		if (!card.isFree()) {
			if (card.upped) return "You cannot upgrade upgraded cards.";
			var use = card.rarity != -1 ? 6 : 1;
			if (cardpool[card.code] >= use) {
				sock.userExec("upgrade", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to upgrade this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("uppillar", { c: card.code });
			goldcount.setText("$" + sock.user.gold);
			adjustdeck();
		}
		else return "You need $50 to afford an upgraded pillar!";
	}
	function polishCard(card) {
		if (!card.isFree()) {
			if (card.shiny) return "You cannot polish shiny cards.";
			if (card.rarity == 5) return "You cannot polish unupped Nymphs.";
			var use = card.rarity != -1 ? 6 : 2;
			if (cardpool[card.code] >= use) {
				sock.userExec("polish", { card: card.code });
				adjustdeck();
			}
			else return "You need at least " + use + " copies to be able to polish this card!";
		}
		else if (sock.user.gold >= 50) {
			sock.userExec("shpillar", { c: card.code });
			goldcount.setText("$" + sock.user.gold);
			adjustdeck();
		}
		else return "You need $50 to afford a shiny pillar!";
	}
	function sellCard(card) {
		if (!card.rarity && !card.upped) return "You can't sell a pillar or pendulum, silly!";
		if (card.rarity == -1) return "You really don't want to sell that, trust me.";
		var codecount = etgutil.count(sock.user.pool, card.code);
		if (codecount) {
			sock.userExec("sellcard", { card: card.code });
			adjustdeck();
			goldcount.setText("$" + sock.user.gold);
		}
		else return "This card is bound to your account; you cannot sell it.";
	}
	function eventWrap(func){
		return function(){
			var error = selectedCard ? func(Cards.Codes[selectedCard]) : "Pick a card, any card.";
			if (error) twarning.setText(error);
		}
	}
	function adjustdeck() {
		cardpool = etgutil.deck2pool(sock.user.pool);
		cardpool = etgutil.deck2pool(sock.user.accountbound, cardpool);
	}
	var upgradeui = px.mkView(function(){
		if (selectedCard) cardArt.setTexture(gfx.getArt(etgutil.asUpped(selectedCard, true)));
	});
	var stage = {view:upgradeui,
		bexit:[5, 50, ["Exit", require("./MainMenu")]],
		bupgrade:[150, 50, ["Upgrade", eventWrap(upgradeCard)]],
		bpolish:[150, 95, ["Polish", eventWrap(polishCard), function() { if (selectedCard) cardArt.setTexture(gfx.getArt(etgutil.asShiny(selectedCard, true))) }]],
		bsell:[150, 140, ["Sell", eventWrap(sellCard)]],
		next:function(){
			cardsel.next(cardpool);
		}
	};

	var goldcount = new px.MenuText(30, 100, "$" + sock.user.gold);
	upgradeui.addChild(goldcount);
	var tinfo = new px.MenuText(250, 50, "");
	upgradeui.addChild(tinfo);
	var tinfo2 = new px.MenuText(250, 140, "");
	upgradeui.addChild(tinfo2);
	var tinfo3 = new px.MenuText(250, 95, "");
	tinfo3.position.set(250, 95);
	upgradeui.addChild(tinfo3);
	var twarning = new px.MenuText(100, 170, "");
	upgradeui.addChild(twarning);
	var cardArt = new PIXI.Sprite(gfx.nopic);
	cardArt.position.set(734, 8);
	upgradeui.addChild(cardArt);
	var selectedCardArt = new PIXI.Sprite(gfx.nopic);
	selectedCardArt.position.set(534, 8);
	upgradeui.addChild(selectedCardArt);

	var cardsel = new px.CardSelector(null,
		function(code){
			var card = Cards.Codes[code];
			selectedCardArt.setTexture(gfx.getArt(code));
			cardArt.setTexture(gfx.getArt(etgutil.asUpped(code, true)));
			selectedCard = code;
			if (card.upped){
				px.setDomVis("bupgrade", tinfo.visible = false);
			}else{
				tinfo.setText(card.isFree() ? "Costs $50 to upgrade" : card.rarity != -1 ? "Convert 6 into an upgraded version." : "Convert into an upgraded version.");
				px.setDomVis("bupgrade", tinfo.visible = true);
			}
			if (card.shiny || card.rarity == 5){
				px.setDomVis("bpolish", tinfo3.visible = false);
			}else{
				tinfo3.setText(card.isFree() ? "Costs $50 to polish" : card.rarity == 5 ? "This card cannot be polished." : card.rarity != -1 ? "Convert 6 into a shiny version." : "Convert 2 into a shiny version.")
				px.setDomVis("bpolish", tinfo3.visible = true);
			}
			px.setDomVis("bsell", ~card.rarity && !card.isFree());
			tinfo2.setText(~card.rarity && !card.isFree() ?
				"Sells for $" + userutil.sellValues[card.rarity] * (card.upped ? 5 : 1) * (card.shiny ? 5 : 1) : "");
			twarning.setText("");
		}, true
	);
	upgradeui.addChild(cardsel);
	var cardpool, selectedCard;
	adjustdeck();
	px.refreshRenderer(stage);
	px.setDomVis("bupgrade", false);
	px.setDomVis("bpolish", false);
	px.setDomVis("bsell", false);
}