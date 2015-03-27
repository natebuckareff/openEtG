"use strict";
var fs = require("fs");
var Cards = require("../Cards");
exports.loadcards = function(){
	var names = ["pillar", "weapon", "shield", "permanent", "spell", "creature"];
	for(var i=0; i<names.length; i++){
		Cards.parseCsv(i, fs.readFileSync(names[i] + ".csv").toString());
	}
	Cards.parseTargeting(fs.readFileSync("active.csv").toString());
	console.log("Cards loaded");
	Cards.loaded = true;
}
exports.prepuser = function(servuser){
	["gold", "daily", "dailymage", "dailydg", "aiwins", "ailosses", "pvpwins", "pvplosses"].forEach(function(field){
		servuser[field] = parseInt(servuser[field] || 0);
	});
}
exports.mkTask = function(cb){
	var params = {}, cbCount = 1;
	function cbCheck(){
		if (--cbCount == 0){
			cb(params);
		}
	}
	return function(param){
		if (arguments.length == 0){
			cbCheck();
		}else{
			cbCount++;
			return function(err, res){
				params[param] = res;
				if (err){
					if (!params.err) params.err = {};
					params.err[param] = err;
				}
				cbCheck();
			}
		}
	}
}
exports.useruser = function(db, servuser, cb){
	var task = exports.mkTask(function(results){
		cb({
			auth: servuser.auth,
			name: servuser.name,
			selectedDeck: servuser.selectedDeck,
			pool: servuser.pool,
			accountbound: servuser.accountbound,
			gold: servuser.gold,
			ocard: servuser.ocard,
			freepacks: servuser.freepacks,
			aiwins: servuser.aiwins,
			ailosses: servuser.ailosses,
			pvpwins: servuser.pvpwins,
			pvplosses: servuser.pvplosses,
			daily: servuser.daily,
			dailymage: servuser.dailymage,
			dailydg: servuser.dailydg,
			decknames: results.decks,
			quest: results.quest,
			quickdecks: results.quickdecks,
		});
	});
	db.hgetall("Q:" + servuser.name, task("quest"));
	db.hgetall("D:" + servuser.name, task("decks"));
	db.lrange("N:" + servuser.name, 0, 9, task("quickdecks"));
	task();
}
exports.getDay = function(){
	return Math.floor(Date.now()/86400000);
}
exports.parseJSON = function(x){
	try{
		return JSON.parse(x);
	}catch(e){
		return null;
	}
}