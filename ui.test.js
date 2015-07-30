"use strict";
require("./httpcards")(function() {
	var etg = require("./etg");
	var Cards = require("./Cards");
	var etgutil = require("./etgutil");
	var Skills = require("./Skills");
	var game, player1, player2;
	function initHand(pl){
		for(var i=1; i<arguments.length; i++){
			pl.hand[i-1] = new etg.CardInstance(arguments[i], pl);
		}
	}
	function gameTest(){
		game = new etg.Game(5489);
		player1 = game.player1;
		player2 = game.player2;
		player1.mark = player2.mark = etg.Entropy;
		player1.deck = [Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar];
		player2.deck = [Cards.BonePillar, Cards.BonePillar, Cards.BonePillar];
		test.apply(null, arguments);
	}
	test("Upped Alignment", function() {
		for(var key in Cards.Codes){
			var un = etgutil.asUpped(key, false), up = etgutil.asUpped(key, true);
			if (!(un in Cards.Codes) || !(up in Cards.Codes)){
				ok(false, key);
			}
		}
		ok(true);
	});
	gameTest("Adrenaline", function() {
		(player1.creatures[0] = new etg.Creature(Cards.Devourer, player1)).status.adrenaline = 1;
		(player1.creatures[1] = new etg.Creature(Cards.HornedFrog, player1)).status.adrenaline = 1;
		(player1.creatures[2] = new etg.Creature(Cards.CrimsonDragon.asUpped(true), player1)).status.adrenaline = 1;
		player2.quanta[etg.Life]=3;
		player1.endturn();
		equal(player2.hp, 68, "dmg");
		equal(player1.quanta[etg.Darkness], 2, "Absorbed");
		equal(player2.quanta[etg.Life], 1, "Lone Life");
	});
	gameTest("Aflatoxin", function() {
		(player1.creatures[0] = new etg.Creature(Cards.Devourer, player1)).status.aflatoxin = true;
		player1.creatures[0].die();
		ok(player1.creatures[0], "Something");
		equal(player1.creatures[0].card, Cards.MalignantCell, "Malignant");
	});
	gameTest("BoneWall", function() {
		player1.quanta[etg.Death] = 8;
		initHand(player1, Cards.BoneWall);
		player1.hand[0].useactive();
		new etg.Creature(Cards.CrimsonDragon, player2).place();
		new etg.Creature(Cards.CrimsonDragon, player2).place();
		new etg.Creature(Cards.CrimsonDragon, player2).place();
		player1.endturn();
		player2.endturn();
		ok(player1.shield, "BW exists");
		equal(player1.shield.status.charges, 4, "4 charges");
		player2.creatures[0].die();
		equal(player1.shield.status.charges, 6, "6 charges");
	});
	gameTest("Boneyard", function() {
		new etg.Creature(Cards.Devourer, player1).place();
		new etg.Permanent(Cards.Boneyard, player1).place();
		player1.creatures[0].die();
		ok(player1.creatures[0], "Something");
		equal(player1.creatures[0].card, Cards.Skeleton, "Skeleton");
	});
	gameTest("Deckout", function() {
		player2.deck.length = 0;
		player1.endturn();
		equal(game.winner, player1);
	});
	gameTest("Destroy", function() {
		player1.quanta[etg.Death] = 10;
		initHand(player1, Cards.AmethystPillar, Cards.AmethystPillar, Cards.SoulCatcher, Cards.Shield, Cards.Dagger);
		while(player1.hand.length){
			player1.hand[0].useactive();
		}
		equal(player1.permanents[0].status.charges, 2, "2 charges");
		Skills.destroy(player2, player1.permanents[0]);
		equal(player1.permanents[0].status.charges, 1, "1 charge");
		Skills.destroy(player2, player1.permanents[0]);
		ok(!player1.permanents[0], "poof");
		equal(player1.permanents[1].card, Cards.SoulCatcher, "SoulCatcher");
		Skills.destroy(player2, player1.permanents[1]);
		ok(!player1.permanents[1], "SoulCatcher gone");
		equal(player1.shield.card, Cards.Shield, "Shield");
		Skills.destroy(player2, player1.shield);
		ok(!player1.shield, "Shield gone");
		equal(player1.weapon.card, Cards.Dagger, "Dagger");
		Skills.destroy(player2, player1.weapon);
		ok(!player1.weapon, "Dagger gone");
		initHand(player1, Cards.BoneWall);
		player1.hand[0].useactive();
		equal(player1.shield.status.charges, 7, "7 bones");
		Skills.destroy(player2, player1.shield);
		equal(player1.shield.status.charges, 6, "6 bones");
		for(var i=0; i<6; i++){
			Skills.destroy(player2, player1.shield);
		}
		ok(!player1.shield, "This town is all in hell");
	});
	gameTest("Devourer", function() {
		new etg.Creature(Cards.Devourer, player1).place();
		player2.quanta[etg.Light] = 1;
		player1.endturn();
		equal(player2.quanta[etg.Light], 0, "Light");
		equal(player1.quanta[etg.Darkness], 1, "Darkness");
	});
	gameTest("Disarm", function() {
		new etg.Creature(Cards.Monk, player1).place();
		new etg.Weapon(Cards.Dagger, player2).place();
		player1.endturn();
		ok(!player2.weapon, "Disarmed");
		equal(player2.hand[0].card, Cards.Dagger, "In hand");
	});
	gameTest("Earthquake", function() {
		initHand(player1, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar, Cards.AmethystPillar);
		for(var i=0; i<5; i++){
			player1.hand[0].useactive();
		}
		equal(player1.hand.length, 3, "handlength");
		var pillars = player1.permanents[0];
		ok(pillars.card.type == etg.PillarEnum, "ispillar");
		equal(pillars.status.charges, 5, "5 charges");
		Skills.earthquake(player2, pillars);
		equal(pillars.status.charges, 2, "2 charges");
		Skills.earthquake(player2, pillars);
		ok(!player1.permanents[0], "poof");
	});
	gameTest("Eclipse", function() {
		player1.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
		player2.deck = [Cards.Ash, Cards.Ash, Cards.Ash];
		for(var i=0; i<2; i++)
			new etg.Creature(Cards.MinorVampire.asUpped(true), player1).place();
		player1.hp = 50;
		player1.endturn();
		player2.endturn();
		equal(player2.hp, 92, "Noclipse dmg'd");
		equal(player1.hp, 58, "Noclipse vamp'd");
		player1.permanents[0] = new etg.Permanent(Cards.Nightfall.asUpped(true), player1);
		player1.endturn();
		equal(player2.hp, 80, "Eclipse dmg'd");
		equal(player1.hp, 70, "Eclipse vamp'd");
		equal(player1.creatures[0].truehp(), 4, "hp buff'd");
	});
	gameTest("Gpull", function() {
		new etg.Creature(Cards.ColossalDragon, player2).place();
		player2.gpull = player2.creatures[0];
		new etg.Creature(Cards.Scorpion, player1).place();
		player2.deck = [Cards.ColossalDragon];
		player1.endturn();
		equal(player2.gpull.hp, 24, "dmg redirected");
		equal(player2.gpull.status.poison, 1, "psn redirected");
		player2.gpull.die();
		ok(!player2.gpull, "gpull death poof");
	});
	gameTest("Hope", function() {
		player1.shield = new etg.Shield(Cards.Hope, player1);
		new etg.Creature(Cards.Photon, player1).place();
		for(var i=0; i<3; i++){
			new etg.Creature(Cards.Photon.asUpped(true), player1).place();
		}
		player1.endturn();
		equal(player1.shield.truedr(), 3, "DR");
		equal(player1.quanta[etg.Light], 4, "RoL");
	});
	gameTest("Lobotomize", function() {
		var dev = new etg.Creature(Cards.Devourer, player1);
		ok(!etg.isEmpty(dev.active), "Skills");
		Skills.lobotomize(dev, dev);
		ok(etg.isEmpty(dev.active), "No more");
	});
	gameTest("Obsession", function() {
		initHand(player1, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast, Cards.GhostofthePast);
		player1.endturn(0);
		equal(player1.hp, 92, "Damage");
		equal(player1.hand.length, 7, "Discarded");
	});
	gameTest("Parallel", function() {
		var damsel = new etg.Creature(Cards.Dragonfly, player1);
		damsel.place();
		Skills.parallel(player1, damsel);
		equal(player1.creatures[1].card, Cards.Dragonfly, "PU'd");
		Skills.web(player1, damsel);
		ok(!damsel.status.airborne && player1.creatures[1].status.airborne, "Web'd");
	});
	gameTest("Phoenix", function() {
		var phoenix = new etg.Creature(Cards.Phoenix, player1);
		phoenix.place();
		Skills.lightning(player1, phoenix);
		equal(player1.creatures[0].card, Cards.Ash, "Ash");
	});
	gameTest("Purify", function() {
		Skills["poison 3"](player1);
		equal(player2.status.poison, 3, "3");
		Skills["poison 3"](player1, player2);
		equal(player2.status.poison, 6, "6");
		Skills.purify(player1, player2);
		equal(player2.status.poison, -2, "-2");
		Skills.purify(player1, player2);
		equal(player2.status.poison, -4, "-4");
	});
	gameTest("Reflect", function() {
		Skills.lightning(player1, player2);
		ok(player1.hp == 100 && player2.hp == 95, "Plain spell");
		player2.shield = new etg.Shield(Cards.MirrorShield, player2);
		Skills.lightning(player1, player2);
		ok(player1.hp == 95 && player2.hp == 95, "Reflected spell");
		player1.shield = new etg.Shield(Cards.MirrorShield, player1);
		Skills.lightning(player1, player2);
		ok(player1.hp == 90 && player2.hp == 95, "Unreflected reflected spell");
	});
	gameTest("Steal", function() {
		(player1.shield = new etg.Shield(Cards.BoneWall, player1)).status.charges=3;
		Skills.steal(player2, player1.shield);
		ok(player1.shield && player1.shield.status.charges == 2, "Wish bones");
		ok(player2.shield && player2.shield.status.charges == 1, "stole 1");
		Skills.steal(player2, player1.shield);
		ok(player1.shield && player1.shield.status.charges == 1, "Lone bone");
		ok(player2.shield && player2.shield.status.charges == 2, "stole 2");
		Skills.steal(player2, player1.shield);
		ok(!player1.shield, "This town is all in hell");
		ok(player2.shield && player2.shield.status.charges == 3, "stole 3");
	});
	gameTest("Steam", function() {
		var steam = new etg.Creature(Cards.SteamMachine, game.player1);
		game.player1.quanta[etg.Fire] = 8;
		steam.usedactive = false;
		steam.place();
		equal(steam.trueatk(), 0, "0");
		steam.useactive();
		equal(steam.trueatk(), 5, "5");
		steam.attack();
		equal(steam.trueatk(), 4, "4");
	});
	gameTest("Transform No Sick", function() {
		player1.quanta[etg.Entropy] = 8;
		var pixie = new etg.Creature(Cards.Pixie, player1);
		pixie.place();
		pixie.usedactive = false;
		pixie.transform(Cards.Pixie);
		ok(pixie.canactive(), "canactive");
	});
	gameTest("Voodoo", function() {
		var voodoo = new etg.Creature(Cards.VoodooDoll, player1);
		voodoo.place();
		Skills.lightning(player1, voodoo);
		Skills.infect(player1, voodoo);
		equal(voodoo.hp, 11, "dmg");
		equal(player2.hp, 95, "foe dmg");
		equal(voodoo.status.poison, 1, "psn");
		equal(player2.status.poison, 1, "foe psn");
		Skills.holylight(player1, voodoo);
		equal(voodoo.hp, 1, "holy dmg");
		equal(player2.hp, 85, "foe holy dmg");
	});
});