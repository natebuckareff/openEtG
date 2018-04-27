module.exports = Player;

var etg = require('./etg');
var util = require('../util');
var Cards = require('./Cards');
var Effect = require('./Effect');
var Actives = require('./Skills');
var CardInstance = etg.CardInstance;
var Thing = etg.Thing;
function Player(game) {
	this.type = etg.Player;
	this.game = game;
	this.owner = this;
	this.shield = undefined;
	this.weapon = undefined;
	this.status = { poison: 0 };
	this.neuro = false;
	this.sosa = 0;
	this.silence = false;
	this.sanctuary = false;
	this.precognition = false;
	this.gpull = undefined;
	this.nova = 0;
	this.nova2 = 0;
	this.maxhp = this.hp = 100;
	this.drawpower = 1;
	this.hand = [];
	this.deck = [];
	this.creatureslots = new Array(23);
	this.creatures = new Array(23);
	this.permanents = new Array(16);
	this.mark = 0;
	this.quanta = [];
	for (var i = 1; i < 13; i++) this.quanta[i] = 0;
	this.shardgolem = undefined;
}

Player.prototype = Object.create(Thing.prototype);

Player.prototype.markpower = 1;
Player.prototype.shuffle = function(array) {
	var counter = array.length,
		temp,
		index;
	while (counter--) {
		index = this.upto(counter) | 0;
		temp = array[counter];
		array[counter] = array[index];
		array[index] = temp;
	}
	return array;
};
Player.prototype.clone = function(game) {
	var obj = Object.create(Player.prototype);
	function maybeClone(x) {
		return x && x.clone(obj);
	}
	obj.status = util.clone(this.status);
	obj.shield = maybeClone(this.shield);
	obj.weapon = maybeClone(this.weapon);
	obj.creatureslots = util.clone(this.creatureslots);
	obj.creatures = this.creatures.map(maybeClone);
	obj.permanents = this.permanents.map(maybeClone);
	if (this.gpull) {
		obj.gpull = obj.creatures[this.gpull.getIndex()];
	}
	obj.hand = this.hand.map(maybeClone);
	obj.deck = this.deck.slice();
	obj.quanta = this.quanta.slice();
	obj.game = game;
	obj.owner = obj;
	for (var attr in this) {
		if (!(attr in obj) && this.hasOwnProperty(attr)) {
			obj[attr] = this[attr];
		}
	}
	return obj;
};
Player.prototype.toString = function() {
	return this == this.game.player1 ? 'p1' : 'p2';
};
Player.prototype.rng = function() {
	return this.game.rng.real();
};
Player.prototype.upto = function(x) {
	return Math.floor(this.game.rng.rnd() * x);
};
Player.prototype.choose = function(x) {
	return x[this.upto(x.length)];
};
Player.prototype.isCloaked = function() {
	for (var i = 0; i < 16; i++) {
		if (this.permanents[i] && this.permanents[i].status.cloak) {
			return true;
		}
	}
	return false;
};
function plinfocore(info, key, val) {
	if (val === true) info.push(key);
	else if (val) info.push(val + key);
}
Player.prototype.info = function() {
	var info = [this.hp + '/' + this.maxhp + ' ' + this.deck.length + 'cards'];
	for (var key in this.status) {
		plinfocore(info, key, this.status[key]);
	}
	['nova', 'neuro', 'sosa', 'silence', 'sanctuary', 'precognition'].forEach(
		function(key) {
			plinfocore(info, key, this[key]);
		},
		this,
	);
	if (this.gpull) info.push('gpull');
	return info.join('\n');
};
Player.prototype.randomquanta = function() {
	var candidates = [];
	for (var i = 1; i < 13; i++) {
		if (this.quanta[i]) candidates.push(i);
	}
	if (candidates.length == 0) {
		return -1;
	}
	return candidates[this.upto(candidates.length)];
};
Player.prototype.canspend = function(qtype, x, cardinst) {
	if (cardinst && cardinst.card.active && cardinst.card.active.cost)
		x -= cardinst.card.active.cost(cardinst);
	if (x <= 0) return true;
	if (!qtype) {
		for (var i = 1; i < 13; i++) {
			x -= this.quanta[i];
			if (x <= 0) {
				return true;
			}
		}
		return false;
	} else return this.quanta[qtype] >= x;
};
Player.prototype.spend = function(qtype, x, cardinst) {
	if (cardinst && cardinst.card.active && cardinst.card.active.cost)
		x -= cardinst.card.active.cost(cardinst);
	if (x == 0) return true;
	if (!this.canspend(qtype, x)) return false;
	if (!qtype) {
		var b = x < 0 ? -1 : 1;
		for (var i = x * b; i > 0; i--) {
			var ele = b == -1 ? this.upto(12) + 1 : this.randomquanta();
			this.quanta[ele] -= b;
			this.proc('quantumgain', [ele, -b]);
		}
	} else {
		this.quanta[qtype] -= x;
		this.proc('quantumgain', [qtype, -x]);
	}
	for (var i = 1; i < 13; i++) {
		if (this.quanta[i] > 75) {
			this.quanta[i] = 75;
		}
	}
	return true;
};
Player.prototype.countcreatures = function() {
	var res = 0;
	for (var i = 0; i < this.creatures.length; i++) {
		if (this.creatures[i]) res++;
	}
	return res;
};
Player.prototype.countpermanents = function() {
	var res = 0;
	for (var i = 0; i < this.permanents.length; i++) {
		if (this.permanents[i]) res++;
	}
	return res;
};
Player.prototype.endturn = function(discard) {
	this.game.ply++;
	if (discard != undefined) {
		var cardinst = this.hand[discard];
		var card = cardinst.card;
		this.hand.splice(discard, 1);
		if (card.active.discard) {
			card.active.discard.func(cardinst, this);
		}
	}
	this.spend(this.mark, this.markpower * (this.mark > 0 ? -1 : -3));
	if (this.foe.status.poison) {
		this.foe.dmg(this.foe.status.poison);
	}
	var patienceFlag = false,
		floodingFlag = false,
		stasisFlag = false,
		freedomChance = 0;
	for (var i = 0; i < 16; i++) {
		var p;
		if ((p = this.permanents[i])) {
			if (~p.getIndex()) {
				p.usedactive = false;
				if (p.status.stasis) {
					stasisFlag = true;
				} else if (p.status.flooding) {
					floodingFlag = true;
				} else if (p.status.patience) {
					patienceFlag = true;
				} else if (p.status.freedom) {
					freedomChance += p.status.charges * 0.25;
				}
			}
		}
		if ((p = this.foe.permanents[i])) {
			if (p.status.stasis) {
				stasisFlag = true;
			} else if (p.status.flooding) {
				floodingFlag = true;
			}
		}
	}
	var cr,
		crs = this.creatures.slice();
	for (var i = 0; i < 23; i++) {
		if ((cr = crs[i])) {
			if (patienceFlag) {
				var floodbuff =
					floodingFlag && i > 4 && cr.card.element == etg.Water ? 5 : 2;
				cr.atk += floodbuff;
				cr.buffhp(floodbuff);
				if (!cr.status.delayed) cr.delay(1);
			}
			cr.attack(stasisFlag, Math.min(freedomChance, 1));
			if (
				i > 4 &&
				floodingFlag &&
				cr.card.element != etg.Water &&
				cr.card.element &&
				!cr.status.immaterial &&
				!cr.status.burrowed &&
				~cr.getIndex()
			) {
				cr.die();
			}
		}
		if ((cr = this.foe.creatures[i])) {
			if (cr.status.salvaged) {
				delete cr.status.salvaged;
			}
			if (cr.active.cast == Actives.dshield) {
				delete cr.status.immaterial;
				delete cr.status.psion;
			}
		}
	}
	this.permanents.forEach(function(p) {
		if (p) p.trigger('auto');
	});
	if (this.shield) {
		this.shield.usedactive = false;
		this.shield.trigger('auto');
	}
	if (this.weapon) this.weapon.attack();
	if (this.foe.sosa > 0) {
		this.foe.sosa--;
	}
	this.nova = this.nova2 = 0;
	for (
		var i = this.foe.drawpower !== undefined ? this.foe.drawpower : 1;
		i > 0;
		i--
	) {
		this.foe.drawcard();
	}

	this.silence = false;
	this.foe.precognition = this.foe.sanctuary = false;
	this.game.turn = this.foe;
	this.foe.proc('turnstart');
	this.game.updateExpectedDamage();
};
Player.prototype.drawcard = function() {
	if (this.hand.length < 8) {
		if (this.deck.length > 0) {
			this.hand[this.hand.length] = new CardInstance(this.deck.pop(), this);
			this.proc('draw');
			if (this.deck.length == 0 && this.game.player1 == this)
				Effect.mkSpriteFadeText(['Last card!', 32, '#fff', '#000']);
		} else this.game.setWinner(this.foe);
	}
};
Player.prototype.drawhand = function() {
	this.shuffle(this.deck);
	var haszerocost = false;
	for (var i = 0; i < 7; i++) {
		var card = Cards.Codes[this.deck.pop()];
		new CardInstance(card, this).place();
		if (!card.cost) haszerocost = true;
	}
	if (!haszerocost) {
		while (this.hand.length) this.deck.push(this.hand.pop().card);
		for (var i = 0; i < 7; i++) {
			new CardInstance(this.deck.shift(), this).place();
		}
	}
};
Player.prototype.masscc = function(caster, func, massmass, saveowncloak) {
	for (var i = 0; i < 16; i++) {
		var pr = this.permanents[i];
		if (pr && pr.status.cloak) {
			Actives.destroy(this, pr);
		}
		if (massmass) {
			pr = this.foe.permanents[i];
			if (pr && pr.status.cloak && !saveowncloak) {
				Actives.destroy(this, pr);
			}
		}
	}
	var crs = this.creatures.slice(),
		crsfoe;
	if (massmass) {
		crsfoe = this.foe.creatures.slice();
	}
	for (var i = 0; i < 23; i++) {
		if (
			crs[i] &&
			!crs[i].status.immaterial &&
			(!crs[i].status.burrowed || func.affectBurrowed)
		) {
			func(caster, crs[i]);
		}
		if (
			crsfoe &&
			crsfoe[i] &&
			!crsfoe[i].status.immaterial &&
			(!crsfoe[i].status.burrowed || func.affectBurrowed)
		) {
			func(caster, crsfoe[i]);
		}
	}
};
Player.prototype.dmg = function(x, ignoresosa) {
	if (!x) return 0;
	var sosa = this.sosa && !ignoresosa;
	if (sosa) {
		x *= -1;
	}
	if (x < 0) {
		var heal = Math.max(this.hp - this.maxhp, x);
		this.hp -= heal;
		return sosa ? -x : heal;
	} else {
		this.hp -= x;
		if (this.hp <= 0) {
			this.game.setWinner(this.foe);
		}
		return sosa ? -x : x;
	}
};
Player.prototype.spelldmg = function(x) {
	return (!this.shield || !this.shield.status.reflect ? this : this.foe).dmg(x);
};
Player.prototype.delay = function(x) {
	if (this.weapon) this.weapon.delay(x);
};
Player.prototype.freeze = function(x) {
	if (this.weapon) this.weapon.freeze(x);
};
Player.prototype.addpoison = function(x) {
	this.status.poison += x;
};
Player.prototype.truehp = function() {
	return this.hp;
};
Player.prototype.randomcard = function(upped, filter) {
	var keys = Cards.filter(upped, filter);
	return keys && keys.length && Cards.Codes[keys[this.upto(keys.length)]];
};